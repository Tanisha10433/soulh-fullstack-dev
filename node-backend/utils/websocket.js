const sockjs = require('sockjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const ConnectionRequest = require('../models/ConnectionRequest');
const { mapMessageToDTO } = require('../routes/messageRoutes');

const JWT_SECRET = process.env.APP_JWT_SECRET || 'soulh-super-secret-jwt-key-must-be-at-least-32-chars-long-for-hmac';

// Map of active connections: userId -> Set of sockJS connection objects
const activeConnections = new Map();

// Helper: parse incoming STOMP frame
const parseStompFrame = (data) => {
  try {
    const lines = data.split('\n');
    const command = lines[0].trim();
    if (!command) return null;

    const headers = {};
    let lineIdx = 1;

    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (line === '') {
        lineIdx++;
        break;
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim();
        headers[key] = val;
      }
    }

    let body = lines.slice(lineIdx).join('\n');
    if (body.endsWith('\0')) {
      body = body.slice(0, -1);
    }

    return { command, headers, body };
  } catch (err) {
    console.error('[STOMP] Error parsing frame:', err);
    return null;
  }
};

// Helper: format STOMP frame
const formatStompFrame = (command, headers = {}, body = '') => {
  let frame = `${command}\n`;
  for (const [key, val] of Object.entries(headers)) {
    frame += `${key}:${val}\n`;
  }
  frame += `\n${body}\0`;
  return frame;
};

// Global broadcast function (accessible by routes)
global.broadcastNotification = (userId, notification) => {
  const connections = activeConnections.get(userId);
  if (connections) {
    connections.forEach(conn => {
      const sub = conn.subscriptions.get('/user/queue/notifications');
      if (sub) {
        const frame = formatStompFrame('MESSAGE', {
          destination: '/user/queue/notifications',
          subscription: sub.id,
          'message-id': new mongoose.Types.ObjectId().toString(),
          'content-type': 'application/json'
        }, JSON.stringify(notification));
        conn.write(frame);
      }
    });
  }
};

const setupWebSocket = (server) => {
  const wsServer = sockjs.createServer({
    prefix: '/ws',
    log: (severity, message) => {
      if (severity === 'error') console.error(`[SockJS] ${message}`);
    }
  });

  wsServer.on('connection', (conn) => {
    conn.subscriptions = new Map(); // subId -> { id, destination }
    conn.userId = null;

    conn.on('data', async (message) => {
      const frame = parseStompFrame(message);
      if (!frame) return;

      const { command, headers, body } = frame;

      switch (command) {
        case 'CONNECT': {
          // Extract token from Authorization header or passcode
          let token = headers['Authorization'] || headers['passcode'];
          if (token && token.startsWith('Bearer ')) {
            token = token.substring(7);
          }

          if (token) {
            try {
              const decoded = jwt.verify(token, JWT_SECRET);
              const identifier = decoded.sub || decoded.email || decoded.id;
              
              let user = await User.findOne({ email: identifier });
              if (!user && mongoose.Types.ObjectId.isValid(identifier)) {
                user = await User.findById(identifier);
              }

              if (user) {
                conn.userId = user._id.toString();
                if (!activeConnections.has(conn.userId)) {
                  activeConnections.set(conn.userId, new Set());
                }
                activeConnections.get(conn.userId).add(conn);
                console.log(`[STOMP] User connected: ${user.email} (${conn.userId})`);
              }
            } catch (err) {
              console.error('[STOMP] JWT auth failed:', err.message);
            }
          }

          // Reply CONNECTED
          const reply = formatStompFrame('CONNECTED', {
            version: '1.2',
            'heart-beat': '0,0'
          });
          conn.write(reply);
          break;
        }

        case 'SUBSCRIBE': {
          const subId = headers['id'];
          const destination = headers['destination'];
          if (subId && destination) {
            conn.subscriptions.set(destination, { id: subId, destination });
            // Reply receipt if requested
            if (headers['receipt']) {
              conn.write(formatStompFrame('RECEIPT', { 'receipt-id': headers['receipt'] }));
            }
          }
          break;
        }

        case 'UNSUBSCRIBE': {
          const subId = headers['id'];
          if (subId) {
            for (const [dest, sub] of conn.subscriptions.entries()) {
              if (sub.id === subId) {
                conn.subscriptions.delete(dest);
                break;
              }
            }
          }
          break;
        }

        case 'SEND': {
          const destination = headers['destination'];
          if (!destination) break;

          let payload = {};
          try {
            if (body) payload = JSON.parse(body);
          } catch (e) {
            console.error('[STOMP] Error parsing JSON body:', e.message);
          }

          // Route send actions
          if (destination === '/app/chat.sendMessage') {
            const { receiverId, content, voiceUrl, mood, isAnonymous } = payload;
            
            if (conn.userId && receiverId) {
              try {
                const sender = await User.findById(conn.userId);
                const receiver = await User.findById(receiverId);

                if (sender && receiver) {
                  // Save message
                  const msg = new Message({
                    senderId: conn.userId,
                    receiverId,
                    content: content || (voiceUrl ? '🎤 Voice Message' : ''),
                    voiceUrl,
                    mood,
                    isAnonymous: !!isAnonymous
                  });
                  await msg.save();
                  const dto = await mapMessageToDTO(msg);

                  // Broadcast message to sender and receiver active connections
                  const broadcastMessage = (userId) => {
                    const connections = activeConnections.get(userId);
                    if (connections) {
                      connections.forEach(c => {
                        const sub = c.subscriptions.get('/user/queue/messages');
                        if (sub) {
                          const msgFrame = formatStompFrame('MESSAGE', {
                            destination: '/user/queue/messages',
                            subscription: sub.id,
                            'message-id': msg._id.toString(),
                            'content-type': 'application/json'
                          }, JSON.stringify(dto));
                          c.write(msgFrame);
                        }
                      });
                    }
                  };

                  broadcastMessage(conn.userId);
                  broadcastMessage(receiverId);
                }
              } catch (err) {
                console.error('[STOMP] SendMessage handler error:', err);
              }
            }
          } 
          
          else if (destination === '/app/chat.typing') {
            const { receiverId, typing } = payload;
            if (conn.userId && receiverId) {
              const rxConns = activeConnections.get(receiverId);
              if (rxConns) {
                rxConns.forEach(c => {
                  const sub = c.subscriptions.get('/user/queue/typing');
                  if (sub) {
                    const typingFrame = formatStompFrame('MESSAGE', {
                      destination: '/user/queue/typing',
                      subscription: sub.id,
                      'content-type': 'application/json'
                    }, JSON.stringify({ senderId: conn.userId, typing: !!typing }));
                    c.write(typingFrame);
                  }
                });
              }
            }
          } 
          
          else if (destination === '/app/chat.react') {
            const { messageId, emoji } = payload;
            if (conn.userId && messageId && emoji) {
              try {
                const message = await Message.findById(messageId);
                if (message) {
                  if (!message.reactions) message.reactions = new Map();
                  
                  const reactors = message.reactions.get(emoji) || [];
                  const idx = reactors.indexOf(conn.userId);
                  if (idx > -1) {
                    reactors.splice(idx, 1);
                  } else {
                    reactors.push(conn.userId);
                  }

                  if (reactors.length === 0) {
                    message.reactions.delete(emoji);
                  } else {
                    message.reactions.set(emoji, reactors);
                  }

                  await message.save();

                  const reactionsObj = {};
                  for (const [key, value] of message.reactions.entries()) {
                    reactionsObj[key] = value;
                  }

                  const update = { messageId, reactions: reactionsObj };

                  const broadcastReaction = (userId) => {
                    const connections = activeConnections.get(userId);
                    if (connections) {
                      connections.forEach(c => {
                        const sub = c.subscriptions.get('/user/queue/reactions');
                        if (sub) {
                          const reactFrame = formatStompFrame('MESSAGE', {
                            destination: '/user/queue/reactions',
                            subscription: sub.id,
                            'content-type': 'application/json'
                          }, JSON.stringify(update));
                          c.write(reactFrame);
                        }
                      });
                    }
                  };

                  broadcastReaction(message.senderId);
                  broadcastReaction(message.receiverId);
                }
              } catch (err) {
                console.error('[STOMP] React handler error:', err);
              }
            }
          } 
          
          else if (destination === '/app/chat.read') {
            const { messageId } = payload;
            if (conn.userId && messageId) {
              try {
                const message = await Message.findById(messageId);
                if (message && message.receiverId === conn.userId && !message.readAt) {
                  message.readAt = new Date();
                  message.status = 'read';
                  await message.save();

                  const update = { readBefore: message.readAt.toISOString(), byUserId: conn.userId };

                  const rxConns = activeConnections.get(message.senderId);
                  if (rxConns) {
                    rxConns.forEach(c => {
                      const sub = c.subscriptions.get('/user/queue/read-receipts');
                      if (sub) {
                        const readFrame = formatStompFrame('MESSAGE', {
                          destination: '/user/queue/read-receipts',
                          subscription: sub.id,
                          'content-type': 'application/json'
                        }, JSON.stringify(update));
                        c.write(readFrame);
                      }
                    });
                  }
                }
              } catch (err) {
                console.error('[STOMP] Read receipt handler error:', err);
              }
            }
          }
          break;
        }

        case 'DISCONNECT': {
          conn.close();
          break;
        }
      }
    });

    conn.on('close', () => {
      if (conn.userId && activeConnections.has(conn.userId)) {
        activeConnections.get(conn.userId).delete(conn);
        if (activeConnections.get(conn.userId).size === 0) {
          activeConnections.delete(conn.userId);
        }
      }
      console.log(`[SockJS] Connection closed for user: ${conn.userId}`);
    });
  });

  // Attach SockJS listener to Express server
  wsServer.installHandlers(server, { prefix: '/ws' });
};

module.exports = setupWebSocket;
