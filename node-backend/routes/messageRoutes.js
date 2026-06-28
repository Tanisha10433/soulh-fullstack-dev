const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const authMiddleware = require('../middleware/authMiddleware');

const Consultation = require('../models/Consultation');

// Helper to check connection between two users (accounts for patient connection request or doctor consultation slot)
const areConnected = async (user1, user2) => {
  if (user1.role === 'USER' && user2.role === 'USER') {
    const req = await ConnectionRequest.findOne({
      $or: [
        { sender: user1._id, receiver: user2._id, status: 'ACCEPTED' },
        { sender: user2._id, receiver: user1._id, status: 'ACCEPTED' }
      ]
    });
    return !!req;
  }
  
  // If one of them is doctor, check consultations
  try {
    const activeStatuses = ['CONFIRMED', 'COMPLETED', 'PENDING', 'ACCEPTED'];
    const active = await Consultation.findOne({
      $or: [
        { patientId: user1._id.toString(), doctorId: user2._id.toString(), status: { $in: activeStatuses } },
        { patientId: user2._id.toString(), doctorId: user1._id.toString(), status: { $in: activeStatuses } }
      ]
    });
    return !!active;
  } catch (e) {
    return false;
  }
};

// Helper function to map a Message to a Response DTO
const mapMessageToDTO = async (message) => {
  const sender = await User.findById(message.senderId);
  const receiver = await User.findById(message.receiverId);

  let senderDTO = null;
  if (message.isAnonymous) {
    senderDTO = {
      id: message.senderId,
      name: 'Anonymous Peer',
      isVerified: false
    };
  } else if (sender) {
    senderDTO = {
      id: sender._id.toString(),
      name: sender.name,
      illnessCondition: sender.illnessCondition,
      isVerified: sender.isVerified
    };
  }

  const receiverDTO = receiver ? {
    id: receiver._id.toString(),
    name: receiver.name
  } : null;

  const resolvedSenderName = message.isAnonymous ? 'Anonymous Peer'
    : (sender ? (sender.name || sender.email.split('@')[0]) : 'Unknown User');
  const resolvedReceiverName = receiver ? (receiver.name || receiver.email.split('@')[0]) : 'Unknown User';

  // Convert mongoose Map to normal JS Object if necessary
  const reactionsObj = {};
  if (message.reactions) {
    for (const [key, value] of message.reactions.entries()) {
      reactionsObj[key] = value;
    }
  }

  return {
    id: message._id.toString(),
    sender: senderDTO,
    receiver: receiverDTO,
    senderId: message.senderId,
    senderName: resolvedSenderName,
    receiverId: message.receiverId,
    receiverName: resolvedReceiverName,
    content: message.content,
    voiceUrl: message.voiceUrl,
    mood: message.mood,
    status: message.status,
    isAnonymous: message.isAnonymous,
    sentAt: message.sentAt,
    readAt: message.readAt,
    reactions: reactionsObj
  };
};

// Fetch full conversation history
router.get('/conversation/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const otherUserId = req.params.otherUserId;

    const messages = await Message.find({
      $or: [
        { senderId: me._id.toString(), receiverId: otherUserId },
        { senderId: otherUserId, receiverId: me._id.toString() }
      ]
    }).sort({ sentAt: 1 });

    const dtos = [];
    for (const msg of messages) {
      dtos.push(await mapMessageToDTO(msg));
    }

    res.json(dtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search messages
router.get('/search/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const otherUserId = req.params.otherUserId;
    const { q = '' } = req.query;

    const messages = await Message.find({
      $or: [
        { senderId: me._id.toString(), receiverId: otherUserId },
        { senderId: otherUserId, receiverId: me._id.toString() }
      ],
      content: { $regex: new RegExp(q, 'i') }
    }).sort({ sentAt: 1 });

    const dtos = [];
    for (const msg of messages) {
      dtos.push(await mapMessageToDTO(msg));
    }

    res.json(dtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message (REST fallback)
router.post('/send/:receiverId', authMiddleware, async (req, res) => {
  try {
    const sender = req.user;
    const receiverId = req.params.receiverId;
    const { content } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Check block list
    if (sender.blockedUserIds.includes(receiverId)) {
      return res.status(400).json({ error: 'You have blocked this user.' });
    }
    if (receiver.blockedUserIds.includes(sender._id.toString())) {
      return res.status(400).json({ error: 'You have been blocked by this user.' });
    }

    // Connection check
    const connected = await areConnected(sender, receiver);
    if (!connected) {
      return res.status(400).json({ error: 'You must be connected with this user to send messages.' });
    }

    const message = new Message({
      senderId: sender._id.toString(),
      receiverId,
      content: content ? content.trim() : '',
      status: 'sent'
    });

    await message.save();
    const dto = await mapMessageToDTO(message);

    res.json(dto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post('/read/:senderId', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const senderId = req.params.senderId;

    const result = await Message.updateMany(
      { senderId, receiverId: me._id.toString(), readAt: null },
      { $set: { readAt: new Date(), status: 'read' } }
    );

    res.json({ markedRead: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Message reaction
router.post('/:messageId/react', authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Toggle reaction logic
    if (!message.reactions) {
      message.reactions = new Map();
    }

    const reactors = message.reactions.get(emoji) || [];
    const index = reactors.indexOf(me._id.toString());
    if (index > -1) {
      reactors.splice(index, 1);
    } else {
      reactors.push(me._id.toString());
    }

    if (reactors.length === 0) {
      message.reactions.delete(emoji);
    } else {
      message.reactions.set(emoji, reactors);
    }

    await message.save();
    res.json(message.reactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.mapMessageToDTO = mapMessageToDTO;
module.exports.areConnected = areConnected;
