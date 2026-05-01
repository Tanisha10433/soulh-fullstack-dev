import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../api';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const REACTIONS = ['❤️', '🫂', '💪', '🙏', '💯', '🔥'];
const MOODS = [
  { emoji: '😊', label: 'Good' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😣', label: 'Anxious' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '❤️', label: 'Loved' }
];

const SUPPORT_STICKERS = [
  { text: "I'm here for you 💙", emoji: "🫂" },
  { text: "Take your time 🤗", emoji: "⏳" },
  { text: "You're strong 🌱", emoji: "💪" },
  { text: "Sending healing vibes ✨", emoji: "✨" },
  { text: "You are not alone 🤝", emoji: "🤝" }
];

const QUICK_REPLIES = ["I understand", "Stay strong", "Thank you", "Sending love", "Take care"];

const HEALTH_EMOJIS = ['💊', '🌡️', '🧠', '🫀', '🩹', '🧘', '🥗', '🚶', '💤', '💧', '🍎', '🍵'];

export default function Chat() {
  const { userId } = useParams(); // Peer ID
  const { user } = useAuth();
  const myId = user?.id;
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { stompClient, isConnected } = useWebSocket();
  const location = useLocation();

  // Handle both /chat/:userId and /chat?recipient=...
  const queryParams = new URLSearchParams(location.search);
  const effectiveUserId = userId || queryParams.get('recipient');

  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [sendingAnonymous, setSendingAnonymous] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showMoods, setShowMoods] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fallback peer info from messages
  const peerFromMessages = useMemo(() => {
    const m = messages.find(msg => msg.sender.id === effectiveUserId || msg.receiver.id === effectiveUserId);
    if (!m) return null;
    return m.sender.id === effectiveUserId ? m.sender : m.receiver;
  }, [messages, effectiveUserId]);

  const displayPeerName = peer?.name || peerFromMessages?.name || (peer ? (peer.email?.split('@')[0]) : 'Loading...');
  const isPeerVerified = peer?.verified || peerFromMessages?.isVerified;

  // ─── INITIALIZATION ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    
    // Load peer info
    api.get(`/api/users/${effectiveUserId}`).then(res => setPeer(res.data)).catch(() => addToast('User not found', 'error'));
    
    // Load history
    api.get(`/api/messages/conversation/${effectiveUserId}`).then(res => {
      setMessages(res.data);
      scrollToBottom();
      // Mark all received messages as read via REST immediately on open
      api.post(`/api/messages/read/${effectiveUserId}`).catch(() => {});
    });

    if (!stompClient || !isConnected) return;

    const sub = stompClient.subscribe(`/user/${myId}/queue/messages`, (payload) => {
      const newMsg = JSON.parse(payload.body);
      if (newMsg.sender.id === userId || newMsg.receiver.id === userId) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === newMsg.id);
          if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
          return [...prev, newMsg];
        });
        scrollToBottom();
        if (newMsg.sender.id === userId) {
          stompClient.publish({ destination: '/app/chat.read', body: JSON.stringify({ messageId: newMsg.id }) });
        }
      }
    });

    const subTyping = stompClient.subscribe(`/user/${myId}/queue/typing`, (payload) => {
      const data = JSON.parse(payload.body);
      if (data.senderId === userId) setPeerTyping(data.typing);
    });

    const subReactions = stompClient.subscribe(`/user/${myId}/queue/reactions`, (payload) => {
      const update = JSON.parse(payload.body);
      setMessages(prev => prev.map(m => m.id === update.messageId ? { ...m, reactions: update.reactions } : m));
    });

    const subStatus = stompClient.subscribe(`/user/${myId}/queue/read-receipts`, (payload) => {
      const data = JSON.parse(payload.body);
      if (data.byUserId === userId) {
        setMessages(prev => prev.map(m => (m.sender.id === myId && !m.readAt) ? { ...m, status: 'read', readAt: data.readBefore } : m));
      }
    });

    return () => { 
      sub.unsubscribe(); 
      subTyping.unsubscribe();
      subReactions.unsubscribe();
      subStatus.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); 
    };
  }, [effectiveUserId, myId, stompClient, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, peerTyping]);

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleTyping = () => {
    if (!stompClient?.connected) return;
    stompClient.publish({ destination: '/app/chat.typing', body: JSON.stringify({ receiverId: effectiveUserId, typing: true }) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stompClient.publish({ destination: '/app/chat.typing', body: JSON.stringify({ receiverId: effectiveUserId, typing: false }) });
    }, 2000);
  };

  const sendMessage = (e, contentOverride = null) => {
    if (e) e.preventDefault();
    const content = contentOverride || text;
    if (!content.trim() || !stompClient?.connected) return;

    stompClient.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify({
        receiverId: effectiveUserId,
        content: content.trim(),
        mood: selectedMood,
        isAnonymous: sendingAnonymous
      })
    });

    setText('');
    setSelectedMood(null);
    setShowMoods(false);
    setShowStickers(false);
    scrollToBottom();
  };

  const reactToMessage = (messageId, emoji) => {
    if (!stompClient?.connected) return;
    stompClient.publish({
      destination: '/app/chat.react',
      body: JSON.stringify({ messageId, emoji })
    });
  };

  const isMyMessage = (msg) => msg.sender.id === myId;
  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  
  const formatDateLabel = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    now.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const grouped = filteredMessages.reduce((g, m) => {
    const k = m.sentAt ? new Date(m.sentAt).toDateString() : 'Unknown';
    if (!g[k]) g[k] = { label: formatDateLabel(m.sentAt), msgs: [] };
    g[k].msgs.push(m); return g;
  }, {});

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] relative overflow-hidden">
      
      {/* ── HEADER (WHATSAPP STYLE) ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#ffffff] shadow-sm z-20 flex-shrink-0 border-b border-gray-100">
        <button onClick={() => navigate('/dashboard')} className="text-[#0d6b5e] p-2 hover:bg-gray-100 rounded-full transition lg:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>

        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white relative shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
          {displayPeerName?.[0]?.toUpperCase() || '?'}
          <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${peerTyping ? 'bg-[#0d6b5e]' : 'bg-green-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[15px] text-gray-900 truncate flex items-center gap-1">
            {displayPeerName}
            {isPeerVerified && (
              <span className="text-[#0d6b5e] text-[10px] bg-[#e2f1ef] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Verified</span>
            )}
          </h2>
          <p className="text-[11px] font-medium leading-none" style={{ color: peerTyping ? '#0d6b5e' : '#6b7280' }}>
            {peerTyping ? 'typing...' : 'Active Now'}
          </p>
        </div>

        <div className="flex items-center gap-1">
           <button onClick={() => setIsSearching(!isSearching)} className="p-2 text-gray-400 hover:text-[#0d6b5e] rounded-full hover:bg-gray-50 transition">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </button>
           <button className="p-2 text-gray-400 hover:text-[#0d6b5e] rounded-full hover:bg-gray-50 transition">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
           </button>
        </div>
      </div>

      {/* ── MESSAGES AREA (DOODLE BACKGROUND) ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 z-10 relative" style={{ 
        backgroundColor: '#E5DDD5',
        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        backgroundBlendMode: 'overlay'
      }}>
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          
          <div className="flex justify-center mb-4">
             <div className="bg-[#E1F3FB] text-[#128C7E] text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-sm text-center">
                🔒 Messages are end-to-end encrypted
             </div>
          </div>

          {Object.entries(grouped).map(([dk, group]) => (
            <React.Fragment key={dk}>
              <div className="flex justify-center my-3">
                <span className="bg-[#ffffff] text-gray-500 text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.msgs.map((msg, i) => {
                const mine = isMyMessage(msg);
                const read = mine && (msg.status === 'read');
                const delivered = mine && (msg.status === 'delivered' || msg.status === 'read');
                
                return (
                  <div key={msg.id || i} className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="relative group max-w-[85%] sm:max-w-[70%]">
                      
                      {/* Hover Reactions */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-white shadow-xl rounded-full px-2 py-1 gap-1 border border-gray-100 z-30 animate-pop-in">
                        {REACTIONS.map(emoji => (
                          <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)} className="hover:scale-150 transition transform px-1 text-lg">
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <div className="px-3 py-1.5 relative shadow-sm transition-all"
                        style={{
                          backgroundColor: mine ? '#DCF8C6' : '#FFFFFF',
                          borderRadius: mine ? '12px 0px 12px 12px' : '0px 12px 12px 12px',
                          border: '1px solid rgba(0,0,0,0.02)'
                        }}>
                        
                        {msg.mood && (
                          <div className="mb-1 flex items-center gap-1.5 p-1 bg-black/5 rounded-md w-fit">
                            <span className="text-sm">{msg.mood}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-black">Mood</span>
                          </div>
                        )}

                        <div className="text-[14px] text-gray-800 leading-normal whitespace-pre-wrap word-break-words pr-12">
                          {msg.content}
                        </div>

                        {/* Reactions Badge */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 bg-white/80 rounded-full px-1.5 py-0.5 w-fit border border-black/5 shadow-sm">
                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                              <span key={emoji} className="text-[11px] flex items-center gap-0.5">
                                <span>{emoji}</span>
                                <span className="font-bold text-[9px] opacity-60">{users.length}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-bold">{formatTime(msg.sentAt)}</span>
                          {mine && (
                            <span className="text-[12px] font-bold leading-none" style={{ color: read ? '#34B7F1' : '#9CA3AF' }}>
                              {read ? '✓✓' : delivered ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          {peerTyping && (
            <div className="flex justify-start mb-2">
               <div className="bg-white px-3 py-1.5 rounded-full shadow-sm text-[#0d6b5e] text-[11px] font-black italic flex items-center gap-2">
                 <span>typing</span>
                 <div className="flex gap-0.5">
                   <div className="w-1 h-1 bg-[#0d6b5e] rounded-full animate-bounce" />
                   <div className="w-1 h-1 bg-[#0d6b5e] rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-1 h-1 bg-[#0d6b5e] rounded-full animate-bounce [animation-delay:0.4s]" />
                 </div>
               </div>
            </div>
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* ── FLOATING MENUS ── */}
      <div className="absolute bottom-20 left-0 w-full z-20 px-4 max-w-3xl mx-auto right-0 flex flex-col gap-2 pointer-events-none">
        
        {/* Stickers Menu */}
        {showStickers && (
          <div className="bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 pointer-events-auto self-center animate-pop-in w-full max-w-sm">
            <h3 className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest text-center">Supportive Stickers 💙</h3>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORT_STICKERS.map(s => (
                <button key={s.text} onClick={() => sendMessage(null, s.text)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#f0f9f8] hover:bg-[#e2f1ef] transition border border-[#0d6b5e]/10 group">
                  <span className="text-3xl group-hover:scale-125 transition">{s.emoji}</span>
                  <span className="text-[11px] font-bold text-[#0d6b5e] text-center">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Replies Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar pointer-events-auto">
          {QUICK_REPLIES.map(q => (
            <button key={q} onClick={() => sendMessage(null, q)}
              className="bg-white/90 backdrop-blur-md text-[#0d6b5e] px-4 py-1.5 rounded-full text-[12px] font-bold shadow-md border border-[#0d6b5e]/20 whitespace-nowrap hover:bg-white transition">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── COMPACT INPUT BAR ── */}
      <div className="bg-[#F0F2F5] px-4 py-2 z-30 flex-shrink-0 border-t border-gray-200">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
          
          <div className="flex-1 bg-white rounded-full flex items-center px-1 shadow-sm border border-gray-200">
            <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} className="p-2.5 text-gray-500 hover:text-[#0d6b5e]">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onChange={e => { setText(e.target.value); handleTyping(); }}
              placeholder="Type a message..."
              className="flex-1 bg-transparent py-2.5 px-1 text-sm focus:outline-none max-h-32 resize-none"
            />

              <button type="button" onClick={() => setSendingAnonymous(!sendingAnonymous)}
                className={`p-2 rounded-full transition ${sendingAnonymous ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-[#0d6b5e]'}`}
                title={sendingAnonymous ? "Sending Anonymously" : "Send as Me"}>
                🎭
              </button>

            <button type="button" onClick={() => setShowStickers(!showStickers)} className={`p-2.5 transition ${showStickers ? 'text-[#0d6b5e]' : 'text-gray-400 hover:text-[#0d6b5e]'}`}>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          </div>

          <button type="submit" disabled={!text.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${text.trim() ? 'bg-[#0d6b5e] scale-100' : 'bg-gray-400 scale-90'}`}>
            <svg className="w-5 h-5 text-white transform rotate-90 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </form>
      </div>

      {/* Emoji Picker (Hidden behind input) */}
      {showEmoji && (
        <div className="absolute bottom-[68px] left-4 bg-white p-3 rounded-2xl shadow-2xl border border-gray-100 z-50 animate-pop-in">
           <div className="grid grid-cols-6 gap-2">
              {HEALTH_EMOJIS.map(e => (
                <button key={e} onClick={() => { setText(p => p+e); setShowEmoji(false); inputRef.current?.focus(); }}
                  className="text-2xl hover:scale-125 transition transform">
                  {e}
                </button>
              ))}
           </div>
        </div>
      )}

    </div>
  );
}
