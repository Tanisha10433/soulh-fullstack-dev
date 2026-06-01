import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDarkMode } = useTheme();

  const [profile, setProfile] = useState(null);
  const [condition, setCondition] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [sendingReq, setSendingReq] = useState({});
  const [sentReqs, setSentReqs] = useState({});

  const [pendingRequests, setPendingRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [discovery, setDiscovery] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [respondingReq, setRespondingReq] = useState({});
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isAnonymousPost, setIsAnonymousPost] = useState(false);
  const [posting, setPosting] = useState(false);

  // ── Feed handlers ───────────────────────────────────────────────actions
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [likingPost, setLikingPost] = useState({});

  const loaded = useRef(false);

  const loadData = async () => {
    try {
      const [profileRes, pendingRes, connRes, doctorsRes, discoveryRes, consultationsRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/connections/pending'),
        api.get('/api/connections'),
        api.get('/api/users/doctors'),
        api.get('/api/users/discover'),
        api.get('/api/consultations/my')
      ]);
      setProfile(profileRes.data);
      setCondition(profileRes.data.illnessCondition || '');
      setIsPublic(profileRes.data.publicProfile);
      setPendingRequests(pendingRes.data);
      setConnections(connRes.data);
      setDoctors(doctorsRes.data);
      setDiscovery(discoveryRes.data);
      setConsultations(consultationsRes.data || []);

      try {
        const postsRes = await api.get('/api/communities/1/posts');
        setPosts(postsRes.data);
      } catch (e) {
        console.log("No community found or posts yet.");
      }
    } catch (err) {
      logout();
      navigate('/login');
    }
  };

  useEffect(() => {
    if (!user) return;
    if (loaded.current) return;
    loaded.current = true;
    loadData();
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const { data } = await api.get(`/api/users/search?condition=${searchTerm}`);
    setSearchResults(data);
    setSearched(true);
  };

  const sendRequest = async (peerId, peer) => {
    setSendingReq(p => ({ ...p, [peerId]: true }));
    try {
      await api.post(`/api/connections/request/${peerId}`);
      setSentReqs(p => ({ ...p, [peerId]: true }));
      sessionStorage.setItem(`peer_${peerId}`, JSON.stringify(peer));
      addToast(`Connection request sent to ${peer.name}!`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not send request.', 'error');
    } finally {
      setSendingReq(p => ({ ...p, [peerId]: false }));
    }
  };

  const respondToRequest = async (requestId, action) => {
    setRespondingReq(p => ({ ...p, [requestId]: true }));
    try {
      await api.patch(`/api/connections/${requestId}`, { action });
      await loadData();
      addToast(action === 'ACCEPT' ? 'Connection accepted! 🎉' : 'Request rejected.', action === 'ACCEPT' ? 'success' : 'info');
    } catch {
      addToast('Action failed. Please try again.', 'error');
    } finally {
      setRespondingReq(p => ({ ...p, [requestId]: false }));
    }
  };

  const saveProfile = async () => {
    setSaving(true); setSaved(false);
    const { data } = await api.patch('/api/users/me', { illnessCondition: condition, publicProfile: isPublic });
    setProfile(data); setSaving(false); setSaved(true);
    addToast('Profile updated!', 'success');
    setTimeout(() => setSaved(false), 3000);
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/api/communities/1/posts', {
        content: newPostContent,
        isAnonymous: String(isAnonymousPost),
      });
      setPosts(prev => [res.data, ...prev]);
      setNewPostContent('');
      setIsAnonymousPost(false);
      addToast('Posted! 🌱', 'success');
    } catch { addToast('Failed to post', 'error'); }
    finally { setPosting(false); }
  };

  const likePost = async (postId) => {
    if (likingPost[postId]) return;
    setLikingPost(l => ({ ...l, [postId]: true }));
    try {
      const res = await api.post(`/api/communities/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch { addToast('Could not like post', 'error'); }
    finally { setLikingPost(l => ({ ...l, [postId]: false })); }
  };

  const saveEditPost = async (postId) => {
    try {
      const res = await api.patch(`/api/communities/posts/${postId}`, { content: editContent });
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
      setEditingPostId(null);
      addToast('Post updated', 'success');
    } catch { addToast('Could not update post', 'error'); }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/api/communities/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      addToast('Post deleted', 'info');
    } catch { addToast('Could not delete post', 'error'); }
  };

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(c => ({ ...c, [postId]: false }));
      return;
    }
    try {
      const res = await api.get(`/api/communities/posts/${postId}/comments`);
      setComments(c => ({ ...c, [postId]: res.data }));
      setExpandedComments(c => ({ ...c, [postId]: true }));
    } catch { addToast('Could not load comments', 'error'); }
  };

  const addComment = async (e, postId) => {
    e.preventDefault();
    const content = commentInput[postId] || '';
    if (!content.trim()) return;
    try {
      const res = await api.post(`/api/communities/posts/${postId}/comments`, { content });
      setComments(c => ({ ...c, [postId]: [...(c[postId] || []), res.data] }));
      setCommentInput(c => ({ ...c, [postId]: '' }));
    } catch { addToast('Could not add comment', 'error'); }
  };

  const getPeerFromConn = (conn) => {
    if (!profile) return null;
    return conn.sender?.email === profile.email ? conn.receiver : conn.sender;
  };

  if (!profile) return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Header Skeleton */}
        <div className="glass p-7 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl" style={{ background: 'rgba(13,107,94,0.1)' }} />
            <div className="space-y-2 flex-1">
              <div className="h-5 rounded-xl w-40" style={{ background: 'rgba(13,107,94,0.1)' }} />
              <div className="h-3 rounded-xl w-24" style={{ background: 'rgba(13,107,94,0.07)' }} />
            </div>
          </div>
        </div>
        {/* Grid Skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-7 space-y-4 animate-pulse">
            <div className="h-5 rounded-xl w-32" style={{ background: 'rgba(13,107,94,0.1)' }} />
            <div className="h-12 rounded-xl" style={{ background: 'rgba(13,107,94,0.07)' }} />
            <div className="h-16 rounded-xl" style={{ background: 'rgba(13,107,94,0.05)' }} />
            <div className="h-12 rounded-xl" style={{ background: 'rgba(13,107,94,0.07)' }} />
          </div>
          <div className="glass p-7 space-y-4 animate-pulse">
            <div className="h-9 rounded-xl" style={{ background: 'rgba(13,107,94,0.07)' }} />
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(13,107,94,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(13,107,94,0.1)' }} />
                  <div className="space-y-1">
                    <div className="h-3 w-24 rounded" style={{ background: 'rgba(13,107,94,0.1)' }} />
                    <div className="h-2 w-16 rounded" style={{ background: 'rgba(13,107,94,0.07)' }} />
                  </div>
                </div>
                <div className="h-7 w-16 rounded-xl" style={{ background: 'rgba(13,107,94,0.1)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabStyle = (key) => ({
    background: activeTab === key ? 'rgba(13,107,94,0.12)' : 'transparent',
    color: activeTab === key ? '#0d6b5e' : '#8aada5',
    fontWeight: activeTab === key ? 700 : 600,
    borderRadius: '10px',
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[600px] h-[600px] top-0 right-[-200px]" style={{ background: 'rgba(13,107,94,0.1)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-[-100px]" style={{ background: 'rgba(232,119,106,0.1)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Welcome Header */}
        <div className="glass p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
              {profile.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Hey, {profile.name.split(' ')[0]} 👋</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Welcome to your SoulH dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`badge ${isPublic ? 'badge-green' : 'badge-indigo'}`}>
              {isPublic ? '🌍 Public' : '🔒 Private'}
            </span>
            {profile.role === 'DOCTOR' && (
              <Link to="/doctor" className="badge badge-teal cursor-pointer hover:opacity-80 transition">
                🌿 Expert Portal
              </Link>
            )}
            {pendingRequests.length > 0 && (
              <button onClick={() => setActiveTab('pending')} className="badge badge-red cursor-pointer animate-pulse">
                🔔 {pendingRequests.length} Request{pendingRequests.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Wellness Stats Widget */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Connections', value: connections.length, icon: '👥', color: '#0d6b5e' },
            { label: 'Posts Shared', value: posts.filter(p => p.author?.id === profile.id).length, icon: '✍️', color: '#0f8b7a' },
            { label: 'Consultations', value: profile.consultationsBooked || 0, icon: '📅', color: '#14b8a6' },
            { label: 'Days Active', value: Math.floor((Date.now() - new Date(profile.createdAt || Date.now())) / (1000 * 60 * 60 * 24)) + 1, icon: '✨', color: '#e8776a' },
          ].map(s => (
            <div key={s.label} className="glass p-4 flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition duration-300">
              <span className="text-2xl mb-1 group-hover:scale-125 transition">{s.icon}</span>
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Health Profile Card */}
          <div className="glass p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(13,107,94,0.1)' }}>🏥</div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>My Health Profile</h2>
            </div>
            <div>
              <label className="field-label">Health Condition / Illness</label>
              <input
                id="condition-input"
                type="text"
                value={condition}
                onChange={e => setCondition(e.target.value)}
                placeholder="e.g. Anxiety, Diabetes, PCOS, Lupus..."
                className="input-field"
              />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Helps match you with peers who share similar experiences.</p>
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: isDarkMode ? 'rgba(13,107,94,0.15)' : 'rgba(13,107,94,0.04)', border: isDarkMode ? '1px solid rgba(13,107,94,0.3)' : '1px solid rgba(13,107,94,0.12)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Profile Visibility</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{isPublic ? 'Visible to all members' : 'Only you can see this'}</p>
              </div>
              <button
                id="privacy-toggle"
                onClick={() => setIsPublic(!isPublic)}
                style={{
                  width: '52px', height: '28px',
                  background: isPublic ? 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' : 'rgba(203,213,225,0.6)',
                  borderRadius: '99px', border: '1px solid rgba(13,107,94,0.2)',
                  transition: 'all 0.3s', cursor: 'pointer', position: 'relative', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px', left: isPublic ? '27px' : '3px',
                  width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                  transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(13,107,94,0.25)',
                }} />
              </button>
            </div>
            <button id="save-profile" onClick={saveProfile} disabled={saving} className="btn-primary w-full py-3.5">
              {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
            </button>
          </div>

          {/* Connections Panel */}
          <div className="glass p-7 space-y-4">
            {/* Tab Bar */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(13,107,94,0.06)' }}>
              {[
                { key: 'feed', label: '🌐 Feed' },
                { key: 'search', label: '🔍 Find' },
                { key: 'discovery', label: '✨ Suggested' },
                { key: 'doctors', label: '👨‍⚕️ Doctors' },
                { key: 'pending', label: `🔔 Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
                { key: 'connections', label: `👥 Connected${connections.length > 0 ? ` (${connections.length})` : ''}` },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="flex-1 py-2 px-1 text-[10px] sm:text-xs transition-all duration-200"
                  style={tabStyle(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* FEED TAB */}
            {activeTab === 'feed' && (
              <div className="space-y-4">
                {/* Create post form */}
                <form onSubmit={createPost} className="p-4 rounded-2xl space-y-3"
                  style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.12)' }}>
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Share your experience, ask a question, or just vent — this is your space."
                    className="input-field w-full"
                    style={{ borderRadius: '12px', minHeight: '72px', resize: 'none', fontSize: '13px' }}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div onClick={() => setIsAnonymousPost(a => !a)}
                        style={{
                          width: '36px', height: '20px',
                          background: isAnonymousPost ? '#0d6b5e' : 'rgba(203,213,225,0.7)',
                          borderRadius: '99px', position: 'relative',
                          transition: 'background 0.2s', cursor: 'pointer',
                        }}>
                        <span style={{
                          position: 'absolute', top: '2px', left: isAnonymousPost ? '18px' : '2px',
                          width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>
                        {isAnonymousPost ? '🎭 Anonymous' : '👤 Public'}
                      </span>
                    </label>
                    <button type="submit" disabled={posting || !newPostContent.trim()}
                      className="btn-primary px-5 py-2 text-xs" style={{ borderRadius: '10px', opacity: posting || !newPostContent.trim() ? 0.6 : 1 }}>
                      {posting ? 'Posting...' : '✍️ Post'}
                    </button>
                  </div>
                </form>

                {/* Post list */}
                <div className="space-y-3" style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '2px' }}>
                  {posts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">🌱</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Be the first to share in the community!</p>
                    </div>
                  ) : posts.map(post => {
                    const isOwn = post.author?.id === profile?.id;
                    const isAnon = post.author?.name === 'Anonymous Warrior';
                    const likedByMe = post.likeUserIds?.includes(profile?.id);
                    const likeCount = post.likeUserIds?.length ?? 0;
                    const commentCount = (comments[post.id] || []).length;
                    const timeAgo = (() => {
                      const d = new Date(post.createdAt);
                      const mins = Math.floor((Date.now() - d) / 60000);
                      if (mins < 1) return 'just now';
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      return `${Math.floor(hrs / 24)}d ago`;
                    })();

                    return (
                      <div key={post.id} className="rounded-2xl overflow-hidden"
                        style={{
                          background: isDarkMode ? '#14221f' : 'rgba(255,255,255,0.85)',
                          border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(13,107,94,0.1)',
                          boxShadow: '0 2px 12px rgba(13,107,94,0.05)'
                        }}>

                        {/* Post header */}
                        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                            style={{ background: isAnon ? '#64748b' : 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
                            {post.author?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm truncate" style={{ color: isDarkMode ? '#f1f5f9' : '#1a3530' }}>
                                {post.author?.name || 'Unknown'}
                                {post.author?.verified && <span className="text-teal-600 text-xs ml-1">✓</span>}
                              </p>
                              {isAnon && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(100,116,139,0.12)', color: '#64748b' }}>ANON</span>
                              )}
                            </div>
                            <p className="text-[10px]" style={{ color: '#8aada5' }}>{timeAgo}</p>
                          </div>
                          {/* Own post actions */}
                          {isOwn && !isAnon && editingPostId !== post.id && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }}
                                  className={`p-1.5 rounded-lg text-[11px] transition ${isDarkMode ? 'hover:bg-[#253f3a]' : 'hover:bg-teal-50'}`} style={{ color: '#8aada5' }}
                                title="Edit">✏️</button>
                              <button onClick={() => deletePost(post.id)}
                                  className={`p-1.5 rounded-lg text-[11px] transition ${isDarkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`} style={{ color: '#8aada5' }}
                                title="Delete">🗑</button>
                            </div>
                          )}
                        </div>

                        {/* Post content / edit */}
                        <div className="px-4 pb-2">
                          {editingPostId === post.id ? (
                            <div className="space-y-2">
                              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                                className="input-field w-full text-xs" style={{ minHeight: '60px', resize: 'none', borderRadius: '10px' }} />
                              <div className="flex gap-2">
                                <button onClick={() => saveEditPost(post.id)} className="btn-primary px-3 py-1.5 text-xs">Save</button>
                                <button onClick={() => setEditingPostId(null)}
                                  className="px-3 py-1.5 text-xs rounded-lg font-semibold"
                                  style={{ background: 'rgba(13,107,94,0.08)', color: '#4a7060' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>{post.content}</p>
                          )}
                        </div>

                        {/* Like + Comments bar */}
                        <div className="flex items-center gap-1 px-4 py-2 border-t" style={{ borderColor: 'rgba(13,107,94,0.07)' }}>
                          <button onClick={() => likePost(post.id)} disabled={likingPost[post.id]}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                            style={{
                              background: likedByMe ? 'rgba(232,119,106,0.1)' : 'transparent',
                              color: likedByMe ? '#e8776a' : '#8aada5',
                            }}>
                            {likedByMe ? '❤️' : '🤍'} {likeCount}
                          </button>
                          <button onClick={() => toggleComments(post.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                            style={{ color: expandedComments[post.id] ? '#0d6b5e' : '#8aada5' }}>
                            💬 {expandedComments[post.id] ? 'Hide' : (commentCount > 0 ? commentCount : 'Comment')}
                          </button>
                        </div>

                        {/* Comments section */}
                        {expandedComments[post.id] && (
                          <div className="px-4 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(13,107,94,0.07)' }}>
                            <div className="space-y-2 pt-2">
                              {(comments[post.id] || []).length === 0 && (
                                <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first!</p>
                              )}
                              {(comments[post.id] || []).map((c, i) => (
                                <div key={i} className="flex gap-2">
                                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
                                    {(c.author?.name || '?')[0]}
                                  </div>
                                  <div className="rounded-xl px-3 py-1.5 text-xs leading-relaxed flex-1"
                                    style={{
                                      background: isDarkMode ? '#1a2d29' : 'rgba(13,107,94,0.06)',
                                      color: isDarkMode ? '#f1f5f9' : '#1a3530'
                                    }}>
                                    <strong>{c.author?.name || 'User'}: </strong>{c.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <form onSubmit={e => addComment(e, post.id)} className="flex flex-col gap-2 pt-1">
                              <div className="flex gap-2">
                                <input value={commentInput[post.id] || ''}
                                  onChange={e => setCommentInput(c => ({ ...c, [post.id]: e.target.value.slice(0, 200) }))}
                                  placeholder="Write a comment..."
                                  className="input-field flex-1 text-xs py-2" style={{ borderRadius: '10px' }} />
                                <button type="submit" className="btn-primary px-3 py-2 text-xs" style={{ borderRadius: '10px' }}>Send</button>
                              </div>
                              <div className="text-[9px] text-right pr-1" style={{ color: (commentInput[post.id]?.length || 0) >= 200 ? '#e8776a' : 'var(--text-muted)' }}>
                                {commentInput[post.id]?.length || 0}/200
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {/* DISCOVERY TAB */}
            {activeTab === 'discovery' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: isDarkMode ? 'rgba(13,107,94,0.15)' : 'rgba(13,107,94,0.06)', border: isDarkMode ? '1px solid rgba(13,107,94,0.3)' : '1px solid rgba(13,107,94,0.1)' }}>
                  <span className="text-xl">✨</span>
                  <p className="text-xs font-semibold" style={{ color: isDarkMode ? 'var(--text-main)' : '#0d6b5e' }}>People with "{profile.illnessCondition}"</p>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {discovery.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">🔭</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No suggestions yet. Try updating your profile!</p>
                    </div>
                  ) : discovery.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(20,34,31,0.6)' : 'rgba(255,255,255,0.6)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(13,107,94,0.1)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{u.name}</p>
                          <p className="text-[10px]" style={{ color: isDarkMode ? 'var(--text-muted)' : '#0d6b5e' }}>Shared Condition</p>
                        </div>
                      </div>
                      <button
                        disabled={sendingReq[u.id] || sentReqs[u.id]}
                        onClick={() => sendRequest(u.id, u)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl transition"
                        style={{
                          background: sentReqs[u.id] ? 'rgba(5,150,105,0.1)' : '#0d6b5e',
                          color: sentReqs[u.id] ? '#047857' : 'white',
                          border: sentReqs[u.id] ? '1px solid rgba(5,150,105,0.25)' : 'none',
                        }}
                      >
                        {sendingReq[u.id] ? '...' : sentReqs[u.id] ? '✓ Sent' : '+ Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEARCH TAB */}
            {activeTab === 'search' && (
              <div className="space-y-3">
                {/* Welcome tips for new users */}
                {connections.length === 0 && !searched && (
                  <div className="p-4 rounded-2xl mb-2" style={{ background: isDarkMode ? 'rgba(13,107,94,0.15)' : 'rgba(13,107,94,0.06)', border: isDarkMode ? '1px solid rgba(13,107,94,0.3)' : '1px solid rgba(13,107,94,0.15)' }}>
                    <p className="font-bold text-sm mb-2" style={{ color: isDarkMode ? 'var(--text-main)' : '#0d6b5e' }}>👋 Getting Started with SoulH</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { num: '1', label: 'Search your condition below' },
                        { num: '2', label: 'Send a connection request' },
                        { num: '3', label: 'Start a private chat' },
                      ].map(s => (
                        <div key={s.num} className="text-center p-2 rounded-xl" style={{ background: isDarkMode ? 'rgba(13,107,94,0.1)' : 'rgba(13,107,94,0.06)' }}>
                          <div className="w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-black text-white" style={{ background: '#0d6b5e' }}>{s.num}</div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSearch} className="space-y-2">
                  <div className="flex gap-2">
                    <input id="search-input" type="text" value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="e.g. Diabetes, Lupus, PCOS..."
                      className="input-field flex-1" style={{ borderRadius: '12px' }} />
                    <button id="search-btn" type="submit" className="btn-primary px-4" style={{ borderRadius: '12px', padding: '12px 16px' }}>Go</button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setFilterVerified(!filterVerified)}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition"
                      style={{
                        background: filterVerified ? '#0d6b5e' : (isDarkMode ? 'rgba(13,107,94,0.1)' : 'white'),
                        border: `1.5px solid ${filterVerified ? '#0d6b5e' : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(13,107,94,0.3)')}`,
                      }}
                    >
                      {filterVerified && <span className="text-white" style={{ fontSize: '10px', fontWeight: 900 }}>✓</span>}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>Show verified doctors only</span>
                  </label>
                </form>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {searched && searchResults.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-3xl mb-2">😔</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No{filterVerified ? ' verified' : ''} users found with this condition.</p>
                    </div>
                  ) : searchResults
                      .filter(u => u.id !== profile.id)
                      .filter(u => !filterVerified || u.verified)
                      .map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDarkMode ? 'rgba(20,34,31,0.4)' : 'rgba(13,107,94,0.04)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(13,107,94,0.1)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{u.name}</p>
                          <p className="text-xs" style={{ color: isDarkMode ? 'var(--text-muted)' : '#0d6b5e' }}>{u.illnessCondition}</p>
                        </div>
                      </div>
                      <button
                        disabled={sendingReq[u.id] || sentReqs[u.id]}
                        onClick={() => sendRequest(u.id, u)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl transition"
                        style={{
                          background: sentReqs[u.id] ? 'rgba(5,150,105,0.1)' : 'rgba(13,107,94,0.1)',
                          color: sentReqs[u.id] ? '#047857' : '#0d6b5e',
                          border: sentReqs[u.id] ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(13,107,94,0.25)',
                        }}
                      >
                        {sendingReq[u.id] ? '...' : sentReqs[u.id] ? '✓ Sent' : '+ Connect'}
                      </button>
                    </div>
                  ))}
                  {!searched && (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">🔍</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Search peers by condition name.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PENDING TAB */}
            {activeTab === 'pending' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8"><p className="text-4xl mb-2">🎉</p><p className="text-sm" style={{ color: '#8aada5' }}>No pending requests.</p></div>
                ) : pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(232,119,106,0.05)', border: '1px solid rgba(232,119,106,0.15)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg, #e8776a, #d45f52)' }}>
                        {req.sender?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1a3530' }}>{req.sender?.name}</p>
                        <p className="text-xs" style={{ color: '#8aada5' }}>{req.sender?.illnessCondition || 'wants to connect'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondToRequest(req.id, 'ACCEPT')} disabled={respondingReq[req.id]}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(5,150,105,0.1)', color: '#047857', border: '1px solid rgba(5,150,105,0.22)' }}>✓</button>
                      <button onClick={() => respondToRequest(req.id, 'REJECT')} disabled={respondingReq[req.id]}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DOCTORS TAB */}
            {activeTab === 'doctors' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                <div className="p-4 rounded-xl mb-3 flex items-center gap-3" style={{ background: isDarkMode ? 'linear-gradient(135deg, rgba(13,107,94,0.2), rgba(15,139,122,0.1))' : 'linear-gradient(135deg, rgba(13,107,94,0.1), rgba(15,139,122,0.05))', border: isDarkMode ? '1px solid rgba(13,107,94,0.3)' : '1px solid rgba(13,107,94,0.2)' }}>
                  <div className="text-3xl">👨‍⚕️</div>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Ask a Doctor</h3>
                    <p className="text-xs" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>Start a free consultation with verified medical professionals.</p>
                  </div>
                </div>

                {doctors.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">🧑‍⚕️</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No verified doctors available right now.</p>
                  </div>
                ) : (
                  doctors.filter(d => d.id !== profile.id).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl shadow-sm transition hover:-translate-y-0.5" style={{ background: isDarkMode ? 'rgba(20,34,31,0.6)' : 'rgba(255,255,255,0.7)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(13,107,94,0.15)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white" style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
                          {doc.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                            {doc.name?.toLowerCase().startsWith('dr.') ? doc.name : `Dr. ${doc.name}`}
                            <span className="badge badge-teal py-0 px-1 text-[9px] relative group cursor-default">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded w-36 text-center shadow-lg pointer-events-none z-50">
                                Officially verified medical credentials by SoulH Admins
                              </span>
                              ✓ Verified
                            </span>
                          </p>
                          <p className="text-xs font-semibold" style={{ color: '#0d6b5e' }}>{doc.illnessCondition} • {doc.experience} Yrs</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{doc.hospital}</p>
                        </div>
                      </div>
                      {consultations.some(c => (c.status === 'CONFIRMED' || c.status === 'COMPLETED') && c.doctorId === doc.id) ? (
                        <Link
                          to={`/chat/${doc.id}`}
                          onClick={() => sessionStorage.setItem(`peer_${doc.id}`, JSON.stringify(doc))}
                          className="text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow"
                          style={{ background: '#0d6b5e', color: 'white' }}
                        >
                          Chat
                        </Link>
                      ) : (
                        <Link
                          to={`/doctors/${doc.id}/book`}
                          className="text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow"
                          style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(13,107,94,0.1)', color: isDarkMode ? 'var(--text-main)' : '#0d6b5e', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(13,107,94,0.2)' }}
                        >
                          Book
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* CONNECTIONS TAB */}
            {activeTab === 'connections' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {connections.length === 0 ? (
                  <div className="text-center py-8"><p className="text-4xl mb-2">🤝</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No connections yet. Find peers above!</p></div>
                ) : connections.map(conn => {
                  const peer = getPeerFromConn(conn);
                  if (!peer) return null;
                  return (
                    <div key={conn.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: isDarkMode ? 'rgba(20,34,31,0.4)' : 'rgba(13,107,94,0.04)', border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(13,107,94,0.12)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg, #0f8b7a, #059669)' }}>
                          {peer.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{peer.name}</p>
                          <p className="text-xs" style={{ color: isDarkMode ? 'var(--text-muted)' : '#0d6b5e' }}>{peer.illnessCondition || 'Connected'}</p>
                        </div>
                      </div>
                      <Link
                        to={`/chat/${peer.id}`}
                        onClick={() => sessionStorage.setItem(`peer_${peer.id}`, JSON.stringify(peer))}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl"
                        style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(13,107,94,0.1)', color: isDarkMode ? 'var(--text-main)' : '#0d6b5e', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(13,107,94,0.2)' }}
                      >
                        💬 Chat
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji: '👨‍⚕️', label: 'Consult Expert', onClick: () => setActiveTab('doctors') },
            { emoji: '👥', label: 'My Connections', onClick: () => setActiveTab('connections') },
            { emoji: '💬', label: 'Messages',     to: null,  soon: connections.length === 0 ? 'Connect first' : null },
            { emoji: '📓', label: 'My Journal',    to: null,  soon: 'Coming Soon' },
          ].map(({ emoji, label, to, onClick, soon, external }) => (
            external ? (
              <a key={label} href={to} target="_blank" rel="noopener noreferrer" className="glass-hover p-5 flex flex-col items-center justify-center gap-2 text-center no-underline">
                <span className="text-3xl">{emoji}</span>
                <span className="text-sm font-semibold" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>{label}</span>
                <span className="badge badge-teal" style={{ padding: '2px 8px', fontSize: '10px' }}>Open</span>
              </a>
            ) : to ? (
              <Link key={label} to={to} className="glass-hover p-5 flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-3xl">{emoji}</span>
                <span className="text-sm font-semibold" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>{label}</span>
              </Link>
            ) : (
              <div key={label} onClick={onClick} className="glass-hover p-5 flex flex-col items-center justify-center gap-2 cursor-pointer text-center">
                <span className="text-3xl">{emoji}</span>
                <span className="text-sm font-semibold" style={{ color: isDarkMode ? 'var(--text-muted)' : '#4a7060' }}>{label}</span>
                {soon && <span className="badge badge-indigo" style={{ padding: '2px 8px', fontSize: '10px' }}>{soon}</span>}
              </div>
            )
          ))}
        </div>

      </div>
    </div>
  );
}
