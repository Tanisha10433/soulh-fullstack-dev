import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useTheme } from '../context/ThemeContext';
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
  const { refreshUser } = useAuth();
  const location = useLocation();
  const { isDarkMode } = useTheme();

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
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDesc, setReportDesc] = useState('');
  
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [isConnectedToPeer, setIsConnectedToPeer] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    if (!effectiveUserId) return;
    setCheckingConnection(true);
    api.get(`/api/connections/status/${effectiveUserId}`)
      .then(res => {
        setIsConnectedToPeer(res.data.connected);
      })
      .catch(() => {
        setIsConnectedToPeer(false);
      })
      .finally(() => {
        setCheckingConnection(false);
      });
  }, [effectiveUserId]);

  // Instant peer info from session storage (saved by Dashboard)
  const cachedPeer = useMemo(() => {
    const saved = sessionStorage.getItem(`peer_${effectiveUserId}`);
    return saved ? JSON.parse(saved) : null;
  }, [effectiveUserId]);

  // Initialize peer from cache immediately so name shows instantly
  useEffect(() => {
    if (cachedPeer && !peer) {
      setPeer(cachedPeer);
    }
  }, [cachedPeer]);

  // ─── VOICE RECORDING ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      addToast('Microphone access denied', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      addToast('Recording cancelled', 'info');
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadVoiceNote = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice_note.webm');
    
    try {
      const res = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      stompClient.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify({
          receiverId: effectiveUserId,
          content: '🎤 Voice Message',
          voiceUrl: res.data.url,
          isAnonymous: sendingAnonymous
        })
      });
      scrollToBottom();
    } catch (err) {
      addToast('Failed to upload voice note', 'error');
    }
  };

  // Fallback peer info from messages — null-safe
  const peerFromMessages = useMemo(() => {
    for (const msg of messages) {
      const sId = msg.sender?.id ?? msg.senderId;
      const rId = msg.receiver?.id ?? msg.receiverId;
      if (sId === effectiveUserId) {
        return { id: sId, name: msg.sender?.name ?? msg.senderName ?? null };
      }
      if (rId === effectiveUserId) {
        return { id: rId, name: msg.receiver?.name ?? msg.receiverName ?? null };
      }
    }
    return null;
  }, [messages, effectiveUserId]);

  // Derive peer name from all available sources
  const displayPeerName = (
    peer?.name ||
    cachedPeer?.name ||
    peerFromMessages?.name ||
    peer?.email?.split('@')[0] ||
    cachedPeer?.email?.split('@')[0] ||
    'Fetching...'
  );
  const isPeerNameLoading = !peer?.name && !cachedPeer?.name && !peerFromMessages?.name;
  const isPeerVerified = peer?.verified ?? peer?.isVerified ?? cachedPeer?.verified ?? cachedPeer?.isVerified ?? peerFromMessages?.isVerified ?? false;

  // ─── LOAD PEER & MESSAGES (always runs) ────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!effectiveUserId) return;

    // Load peer info from API (overrides cache with fresh data)
    api.get(`/api/users/${effectiveUserId}`)
      .then(res => {
        setPeer(res.data);
        // Update cache with fresh data
        sessionStorage.setItem(`peer_${effectiveUserId}`, JSON.stringify(res.data));
      })
      .catch(() => addToast('Could not load user info', 'error'));

    // Load message history
    api.get(`/api/messages/conversation/${effectiveUserId}`).then(res => {
      setMessages(res.data);
      scrollToBottom();
      api.post(`/api/messages/read/${effectiveUserId}`).catch(() => {});
    });
  }, [effectiveUserId, user]);

  // ─── WEBSOCKET SUBSCRIPTIONS (runs when connected) ─────────────────────────
  useEffect(() => {
    if (!stompClient || !isConnected || !myId || !effectiveUserId) return;

    const sub = stompClient.subscribe(`/user/queue/messages`, (payload) => {
      const newMsg = JSON.parse(payload.body);
      // Debug — remove after verifying
      console.debug('[Chat WS] Incoming message:', JSON.stringify(newMsg, null, 2));

      // Normalize: support both nested sender/receiver objects and flat senderId/receiverName fields
      const msgSenderId = newMsg.sender?.id ?? newMsg.senderId;
      const msgReceiverId = newMsg.receiver?.id ?? newMsg.receiverId;

      if (msgSenderId === effectiveUserId || msgReceiverId === effectiveUserId) {
        // If peer name is still unknown, try to extract from message
        if (!peer?.name) {
          const peerName = msgSenderId === effectiveUserId
            ? (newMsg.sender?.name ?? newMsg.senderName)
            : (newMsg.receiver?.name ?? newMsg.receiverName);
          if (peerName) {
            setPeer(prev => prev ? { ...prev, name: peerName } : { id: effectiveUserId, name: peerName });
          }
        }

        setMessages(prev => {
          const exists = prev.find(m => m.id === newMsg.id);
          if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
          return [...prev, newMsg];
        });
        scrollToBottom();
        if (msgSenderId === effectiveUserId) {
          stompClient.publish({ destination: '/app/chat.read', body: JSON.stringify({ messageId: newMsg.id }) });
        }
      }
    });

    const subTyping = stompClient.subscribe(`/user/queue/typing`, (payload) => {
      const data = JSON.parse(payload.body);
      if (data.senderId === effectiveUserId) setPeerTyping(data.typing);
    });

    const subReactions = stompClient.subscribe(`/user/queue/reactions`, (payload) => {
      const update = JSON.parse(payload.body);
      setMessages(prev => prev.map(m => m.id === update.messageId ? { ...m, reactions: update.reactions } : m));
    });

    const subStatus = stompClient.subscribe(`/user/queue/read-receipts`, (payload) => {
      const data = JSON.parse(payload.body);
      if (data.byUserId === effectiveUserId) {
        setMessages(prev => prev.map(m => {
          const mySenderId = m.sender?.id ?? m.senderId;
          return (mySenderId === myId && !m.readAt)
            ? { ...m, status: 'read', readAt: data.readBefore }
            : m;
        }));
      }
    });

    return () => {
      sub.unsubscribe();
      subTyping.unsubscribe();
      subReactions.unsubscribe();
      subStatus.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [effectiveUserId, myId, stompClient, isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, peerTyping]);

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const sendMessage = (e, contentOverride = null) => {
    if (e) e.preventDefault();
    const content = contentOverride || text;
    if (!content.trim() || !isConnected || !stompClient) return;

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

  const handleTyping = () => {
    if (!stompClient?.connected) return;
    stompClient.publish({ destination: '/app/chat.typing', body: JSON.stringify({ receiverId: effectiveUserId, typing: true }) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stompClient.publish({ destination: '/app/chat.typing', body: JSON.stringify({ receiverId: effectiveUserId, typing: false }) });
    }, 2000);
  };

  const isBlockedByMe = user?.blockedUserIds?.includes(effectiveUserId);
  const isBlockingMe = peer?.blockedUserIds?.includes(myId);

  const handleBlock = async () => {
    setShowOptions(false);
    if (window.confirm(`Are you sure you want to ${isBlockedByMe ? 'unblock' : 'block'} this user?`)) {
      try {
        if (isBlockedByMe) {
          await api.post(`/api/users/${effectiveUserId}/unblock`);
          addToast('User unblocked', 'success');
        } else {
          await api.post(`/api/users/${effectiveUserId}/block`);
          addToast('User blocked', 'success');
        }
        await refreshUser();
      } catch {
        addToast('Action failed', 'error');
      }
    }
  };

  const submitReport = async () => {
    try {
      await api.post(`/api/users/${effectiveUserId}/report`, {
        reason: reportReason,
        description: reportDesc
      });
      addToast('Report submitted. We will investigate.', 'success');
      setShowReportModal(false);
      setReportDesc('');
    } catch {
      addToast('Failed to submit report', 'error');
    }
  };

  const reactToMessage = (messageId, emoji) => {
    if (!stompClient?.connected) return;
    stompClient.publish({
      destination: '/app/chat.react',
      body: JSON.stringify({ messageId, emoji })
    });
  };

  // null-safe: support both nested sender object and flat senderId field
  const isMyMessage = (msg) => (msg.sender?.id ?? msg.senderId) === myId;
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
    <div className={`flex flex-col h-screen relative overflow-hidden ${isDarkMode ? 'bg-[#0f1715] text-slate-100' : 'bg-[#F0F2F5] text-gray-800'}`}>
      
      {/* ── HEADER (WHATSAPP STYLE) ── */}
      <div className={`flex items-center gap-3 px-4 py-2 shadow-sm z-20 flex-shrink-0 border-b ${isDarkMode ? 'bg-[#14221f] border-gray-800' : 'bg-[#ffffff] border-gray-100'}`}>
        <button onClick={() => navigate('/dashboard')} className={`p-2 rounded-full transition lg:hidden ${isDarkMode ? 'text-teal-400 hover:bg-[#253f3a]' : 'text-[#0d6b5e] hover:bg-gray-100'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>

        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white relative shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
          {displayPeerName?.[0]?.toUpperCase() || '?'}
          <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full ${peerTyping ? 'bg-[#0d6b5e]' : 'bg-green-500'} ${isDarkMode ? 'border-[#14221f]' : 'border-white'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className={`font-bold text-[15px] truncate flex items-center gap-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
            {isPeerNameLoading ? (
              <span className="inline-block w-28 h-4 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <>
                {displayPeerName}
                {isPeerVerified && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${isDarkMode ? 'text-teal-400 bg-[#253f3a]' : 'text-[#0d6b5e] bg-[#e2f1ef]'}`}>Verified</span>
                )}
              </>
            )}
          </h2>
          <p className="text-[11px] font-medium leading-none" style={{ color: peerTyping ? (isDarkMode ? '#2dd4bf' : '#0d6b5e') : (isDarkMode ? '#8aada5' : '#6b7280') }}>
            {peerTyping ? 'typing...' : 'Active Now'}
          </p>
        </div>

        <div className="flex items-center gap-1 relative">
           <button onClick={() => setIsSearching(!isSearching)} className={`p-2 rounded-full transition ${isDarkMode ? 'text-teal-400 hover:text-teal-300 hover:bg-[#253f3a]' : 'text-gray-400 hover:text-[#0d6b5e] hover:bg-gray-50'}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </button>
           <button onClick={() => setShowOptions(!showOptions)} className={`p-2 rounded-full transition ${isDarkMode ? 'text-teal-400 hover:text-teal-305 hover:bg-[#253f3a]' : 'text-gray-400 hover:text-[#0d6b5e] hover:bg-gray-50'}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
           </button>

           {showOptions && (
             <div className={`absolute right-0 top-12 w-48 rounded-2xl shadow-2xl border py-2 z-50 animate-pop-in ${isDarkMode ? 'bg-[#1a2d29] border-gray-800' : 'bg-white border-gray-100'}`}>
               <button onClick={handleBlock} className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center gap-3 ${isDarkMode ? 'text-slate-200 hover:bg-[#253f3a]' : 'text-gray-700 hover:bg-gray-50'}`}>
                 <span className="text-lg">{isBlockedByMe ? '🔓' : '🚫'}</span>
                 {isBlockedByMe ? 'Unblock User' : 'Block User'}
               </button>
               <button onClick={() => { setShowReportModal(true); setShowOptions(false); }} className={`w-full text-left px-4 py-2.5 text-sm font-bold flex items-center gap-3 ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-650 hover:bg-red-50'}`}>
                 <span className="text-lg">🚩</span>
                 Report User
               </button>
             </div>
           )}
        </div>
      </div>

      {/* ── MESSAGES AREA (DOODLE BACKGROUND) ── */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 z-10 relative" style={{ 
        backgroundColor: isDarkMode ? '#0f1715' : '#E5DDD5',
        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        backgroundBlendMode: isDarkMode ? 'multiply' : 'overlay',
        opacity: isDarkMode ? 0.95 : 1
      }}>
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          
          <div className="flex justify-center mb-4">
             <div className={`text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-sm text-center ${isDarkMode ? 'bg-[#1a2d29] text-teal-400' : 'bg-[#E1F3FB] text-[#128C7E]'}`}>
                🔒 Messages are end-to-end encrypted
             </div>
          </div>

          {Object.entries(grouped).map(([dk, group]) => (
            <React.Fragment key={dk}>
              <div className="flex justify-center my-3">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm uppercase tracking-wider ${isDarkMode ? 'bg-[#1a2d29] text-slate-400' : 'bg-[#ffffff] text-gray-500'}`}>
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
                      <div className={`absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex shadow-xl rounded-full px-2 py-1 gap-1 border z-30 animate-pop-in ${isDarkMode ? 'bg-[#1a2d29] border-gray-800' : 'bg-white border-gray-100'}`}>
                        {REACTIONS.map(emoji => (
                          <button key={emoji} onClick={() => reactToMessage(msg.id, emoji)} className="hover:scale-150 transition transform px-1 text-lg">
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <div className="px-3 py-1.5 relative shadow-sm transition-all"
                        style={{
                          backgroundColor: mine ? (isDarkMode ? '#0b5247' : '#DCF8C6') : (isDarkMode ? '#1a2d29' : '#FFFFFF'),
                          borderRadius: mine ? '12px 0px 12px 12px' : '0px 12px 12px 12px',
                          border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.02)'
                        }}>
                        
                        {/* Chat Sender Name Display */}
                        <div className={`text-[10px] font-bold mb-0.5 ${mine ? (isDarkMode ? 'text-teal-350' : 'text-[#0a7265]') : (isDarkMode ? 'text-teal-400' : 'text-[#0d6b5e]')}`}>
                          {mine ? 'You' : (msg.isAnonymous ? 'Anonymous Peer' : (msg.senderName || msg.sender?.name || 'Peer'))}
                        </div>

                        {msg.mood && (
                          <div className="mb-1 flex items-center gap-1.5 p-1 bg-black/5 rounded-md w-fit">
                            <span className="text-sm">{msg.mood}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-black">Mood</span>
                          </div>
                        )}

                        {msg.voiceUrl && (
                          <div className="mb-2 mt-1">
                             <audio controls className="h-8 max-w-[200px] sm:max-w-[240px]">
                                <source src={`${api.defaults.baseURL}${msg.voiceUrl}`} type="audio/webm" />
                                Your browser does not support audio.
                             </audio>
                          </div>
                        )}

                        <div className={`text-[14px] leading-normal whitespace-pre-wrap word-break-words pr-12 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                          {msg.content}
                        </div>

                        {/* Reactions Badge */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 rounded-full px-1.5 py-0.5 w-fit border shadow-sm ${isDarkMode ? 'bg-[#14221f]/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                              <span key={emoji} className="text-[11px] flex items-center gap-0.5">
                                <span>{emoji}</span>
                                <span className={`font-bold text-[9px] ${isDarkMode ? 'text-slate-400' : 'opacity-60'}`}>{users.length}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                          <span className={`text-[9px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{formatTime(msg.sentAt)}</span>
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
               <div className={`px-3 py-1.5 rounded-full shadow-sm text-[11px] font-black italic flex items-center gap-2 ${isDarkMode ? 'bg-[#1a2d29] text-teal-400' : 'bg-white text-[#0d6b5e]'}`}>
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

      {/* Floating Scroll to Top / Bottom Buttons */}
      <div className="absolute bottom-24 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border ${
            isDarkMode 
              ? 'bg-[#1a2d29] text-teal-400 border-teal-500/20 hover:bg-[#253f3a]' 
              : 'bg-white text-[#0d6b5e] border-[#0d6b5e]/20 hover:bg-gray-50'
          }`}
          title="Scroll to Top"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border ${
            isDarkMode 
              ? 'bg-[#1a2d29] text-teal-400 border-teal-500/20 hover:bg-[#253f3a]' 
              : 'bg-white text-[#0d6b5e] border-[#0d6b5e]/20 hover:bg-gray-50'
          }`}
          title="Scroll to Bottom"
        >
          ▼
        </button>
      </div>

      {/* ── FLOATING MENUS ── */}
      <div className="absolute bottom-20 left-0 w-full z-20 px-4 max-w-3xl mx-auto right-0 flex flex-col gap-2 pointer-events-none">
        
        {/* Stickers Menu */}
        {showStickers && (
          <div className={`p-4 rounded-3xl shadow-2xl border pointer-events-auto self-center animate-pop-in w-full max-w-sm ${isDarkMode ? 'bg-[#1a2d29] border-gray-800' : 'bg-white border-gray-100'}`}>
            <h3 className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest text-center">Supportive Stickers 💙</h3>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORT_STICKERS.map(s => (
                <button key={s.text} onClick={() => sendMessage(null, s.text)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition border group ${isDarkMode ? 'bg-[#14221f] hover:bg-[#253f3a] border-teal-500/10' : 'bg-[#f0f9f8] hover:bg-[#e2f1ef] border-[#0d6b5e]/10'}`}>
                  <span className="text-3xl group-hover:scale-125 transition">{s.emoji}</span>
                  <span className={`text-[11px] font-bold text-center ${isDarkMode ? 'text-teal-400' : 'text-[#0d6b5e]'}`}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Replies Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar pointer-events-auto">
          {QUICK_REPLIES.map(q => (
            <button key={q} onClick={() => sendMessage(null, q)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold shadow-md border whitespace-nowrap transition ${isDarkMode ? 'bg-[#1a2d29]/90 text-teal-400 border-teal-500/20 hover:bg-[#1a2d29]' : 'bg-white/90 text-[#0d6b5e] border-[#0d6b5e]/20 hover:bg-white'}`}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── COMPACT INPUT BAR ── */}
      <div className={`px-4 py-2 z-30 flex-shrink-0 border-t ${isDarkMode ? 'bg-[#0f1715] border-gray-800' : 'bg-[#F0F2F5] border-gray-200'}`}>
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
          
          {isBlockedByMe ? (
            <div className={`flex-1 rounded-full px-6 py-3 text-center text-sm font-bold border ${isDarkMode ? 'bg-[#1a2d29] text-slate-400 border-gray-800' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
               You have blocked this user. <button onClick={handleBlock} className="text-[#0d6b5e] underline ml-1">Unblock</button>
            </div>
          ) : isBlockingMe ? (
            <div className={`flex-1 rounded-full px-6 py-3 text-center text-sm font-bold border ${isDarkMode ? 'bg-[#1a2d29] text-slate-400 border-gray-800' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
               You can no longer send messages to this user.
            </div>
          ) : (!checkingConnection && !isConnectedToPeer) ? (
            <div className={`flex-1 rounded-2xl px-6 py-4 text-center text-sm font-bold border flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-[#1a2d29] text-slate-300 border-teal-500/20' : 'bg-teal-50/50 text-[#0d6b5e] border-[#0d6b5e]/20'}`}>
               <span>
                 {peer?.role === 'DOCTOR' 
                   ? "You can only message this doctor if you have a confirmed consultation." 
                   : "You must be connected with this user to send messages."}
               </span>
               {peer?.role === 'DOCTOR' ? (
                 <button 
                   type="button" 
                   onClick={() => navigate(`/doctors/${peer.id}/book`)}
                   className="px-5 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest bg-[#0d6b5e] hover:bg-[#0b5e52] shadow-md hover:scale-[1.02] active:scale-[0.98] transition shrink-0">
                   Book Consultation
                 </button>
               ) : (
                 <button 
                   type="button" 
                   onClick={() => navigate('/dashboard')}
                   className="px-5 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest bg-[#0d6b5e] hover:bg-[#0b5e52] shadow-md hover:scale-[1.02] active:scale-[0.98] transition shrink-0">
                   Back to Dashboard
                 </button>
               )}
            </div>
          ) : isRecording ? (
            <div className={`flex-1 rounded-full flex items-center px-4 py-2 shadow-sm border ${isDarkMode ? 'bg-[#14221f] border-red-905/50' : 'bg-white border-red-200'}`}>
               <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse" />
               <span className="text-red-500 font-bold text-sm flex-1 tracking-tight">
                 Recording... {formatRecordingTime(recordingTime)}
               </span>
               <div className="flex gap-2">
                 <button type="button" onClick={cancelRecording} className="p-2 text-gray-400 hover:text-gray-600 transition">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
                 <button type="button" onClick={stopRecording} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-md">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                 </button>
               </div>
            </div>
          ) : (
            <div className={`flex-1 rounded-full flex items-center px-1 shadow-sm border ${isDarkMode ? 'bg-[#14221f] border-gray-800' : 'bg-white border-gray-200'}`}>
              <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} className={`p-2.5 transition ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-gray-500 hover:text-[#0d6b5e]'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                onChange={e => { setText(e.target.value); handleTyping(); }}
                placeholder="Type a message..."
                className={`flex-1 bg-transparent py-2.5 px-1 text-sm focus:outline-none max-h-32 resize-none ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}
              />

                <button type="button" onClick={() => setSendingAnonymous(!sendingAnonymous)}
                  className={`p-2 rounded-full transition ${sendingAnonymous ? 'text-red-500 bg-red-50' : (isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-gray-400 hover:text-[#0d6b5e]')}`}
                  title={sendingAnonymous ? "Sending Anonymously" : "Send as Me"}>
                  🎭
                </button>

              <button type="button" onClick={() => setShowStickers(!showStickers)} className={`p-2.5 transition ${showStickers ? (isDarkMode ? 'text-teal-300' : 'text-[#0d6b5e]') : (isDarkMode ? 'text-teal-400 hover:text-[#0d6b5e]' : 'text-gray-400 hover:text-[#0d6b5e]')}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              
              <button type="button" onClick={startRecording} className={`p-2.5 transition ${isDarkMode ? 'text-teal-400 hover:text-teal-300' : 'text-gray-400 hover:text-[#0d6b5e]'}`}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
            </div>
          )}

          {!isBlockedByMe && !isBlockingMe && (
            <button type="submit" disabled={!text.trim()}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${text.trim() ? 'bg-[#0d6b5e] scale-100' : (isDarkMode ? 'bg-[#1a2d29] scale-90' : 'bg-gray-400 scale-90')}`}>
              <svg className="w-5 h-5 text-white transform rotate-90 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          )}
        </form>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-pop-in ${isDarkMode ? 'bg-[#1a2d29] text-slate-100' : 'bg-white'}`}>
            <h3 className="text-2xl font-black mb-2">Report User</h3>
            <p className={`text-sm mb-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Help us keep SoulH safe. Tell us what's wrong with this conversation.</p>
            
            <div className="space-y-6">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Reason</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HARASSMENT', 'SPAM', 'INAPPROPRIATE', 'SCAM', 'OTHER'].map(r => (
                    <button key={r} onClick={() => setReportReason(r)}
                      className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition ${reportReason === r ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : (isDarkMode ? 'bg-[#14221f] text-slate-400 hover:bg-[#253f3a]' : 'bg-gray-50 text-gray-400 hover:bg-gray-100')}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Additional Context</label>
                <textarea 
                  value={reportDesc} 
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Tell us more..."
                  className={`w-full border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 min-h-[100px] resize-none ${isDarkMode ? 'bg-[#14221f] text-slate-200' : 'bg-gray-50'}`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowReportModal(false)} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition ${isDarkMode ? 'bg-[#14221f] text-slate-400 hover:bg-[#253f3a]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Cancel</button>
                <button onClick={submitReport} className="flex-1 py-4 rounded-2xl bg-red-650 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-red-650/20 hover:scale-105 transition active:scale-95">Submit Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker (Hidden behind input) */}
      {showEmoji && (
        <div className={`absolute bottom-[68px] left-4 p-3 rounded-2xl shadow-2xl border z-50 animate-pop-in ${isDarkMode ? 'bg-[#1a2d29] border-gray-800' : 'bg-white border-gray-100'}`}>
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
