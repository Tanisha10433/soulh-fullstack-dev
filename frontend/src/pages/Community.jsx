import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

// ─── Post Card Component ──────────────────────────────────────────────────────
function PostCard({ post, onLike }) {
  const { user: currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/api/posts/${post.id}/comments`);
      setComments(res.data);
    } catch { }
    finally { setLoadingComments(false); }
  }, [post.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/api/posts/${post.id}/comments`, { content: newComment });
      setNewComment('');
      loadComments();
    } catch { }
  };

  const isDoctor = post.author?.role === 'DOCTOR';
  const isMe = post.author?.id === currentUser?.id;

  return (
    <div className="glass overflow-hidden transition hover:shadow-xl animate-fade-in">
      <div className="p-5">
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
            style={{ background: post.isAnonymous ? '#64748b' : 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
            {post.isAnonymous ? '🎭' : post.author?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#1a3530' }}>
              {post.author?.name}
              {isDoctor && (
                <span className="bg-[#0d6b5e] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-tighter">
                  Verified Doctor
                </span>
              )}
            </h3>
            <p className="text-[10px] font-medium" style={{ color: '#8aada5' }}>
              {new Date(post.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {post.illnessTag && (
            <div className="ml-auto bg-[#e2f1ef] text-[#0d6b5e] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border border-[#0d6b5e]/10">
              {post.illnessTag}
            </div>
          )}
        </div>

        {/* Content */}
        <p className="text-[14.5px] text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* Media Attachments */}
        {(post.imageUrl || post.fileUrl) && (
          <div className="mb-4 space-y-2">
            {post.imageUrl && (
              <img src={post.imageUrl} alt="Post Attachment" className="w-full rounded-2xl border border-gray-100 shadow-sm" />
            )}
            {post.fileUrl && (
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-dashed border-[#0d6b5e]/20 group hover:border-[#0d6b5e]/40 transition">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-[#e2f1ef] rounded-lg flex items-center justify-center text-[#0d6b5e]">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-gray-800">Shared Resource.pdf</p>
                     <p className="text-[10px] text-gray-400">Resource shared by {post.author?.name}</p>
                   </div>
                </div>
                <button className="text-[11px] font-bold text-[#0d6b5e] hover:underline">Download</button>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
          <button onClick={() => onLike(post.id)}
            className="flex items-center gap-2 text-xs font-bold transition hover:scale-105"
            style={{ color: post.likes?.some(u => u.id === currentUser?.id) ? '#e11d48' : '#6b7280' }}>
            <span>{post.likes?.some(u => u.id === currentUser?.id) ? '❤️' : '🤍'}</span>
            {post.likes?.length || 0} Likes
          </button>
          <button onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0d6b5e] transition">
            <span>💬</span> {comments.length > 0 ? comments.length : (showComments ? 'Hide' : 'Comments')}
          </button>
          <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0d6b5e] transition ml-auto">
            <span>🔗</span> Share
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-slide-down">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Write a supportive comment..."
                className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/10 border border-gray-100" />
              <button type="submit" className="bg-[#0d6b5e] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                Post
              </button>
            </form>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {loadingComments ? (
                <div className="text-center py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading...</div>
              ) : comments.length === 0 ? (
                <p className="text-center py-4 text-xs text-gray-400 italic">No comments yet. Be the first to support!</p>
              ) : comments.map(c => (
                <div key={c.id} className="flex gap-3 items-start bg-gray-50/50 p-3 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-800 shrink-0">
                    {c.author?.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-gray-800">{c.author?.name}</p>
                    <p className="text-xs text-gray-600 leading-tight">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Community Page ─────────────────────────────────────────────────────
export default function Community() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('ALL');
  
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', illnessTag: 'ANXIETY', isAnonymous: false, imageUrl: '', fileUrl: '' });
  const [posting, setPosting] = useState(false);

  const TAGS = ['ANXIETY', 'PAIN', 'DIABETES', 'LUPUS', 'GENERAL', 'RESOURCES'];

  const loadPosts = useCallback(async (isInitial = true) => {
    try {
      const currentPage = isInitial ? 0 : page;
      const res = await api.get(`/api/posts?page=${currentPage}&size=10`);
      const newPosts = res.data;
      
      if (isInitial) {
        setPosts(newPosts);
        setPage(1);
        setHasMore(newPosts.length === 10);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(prev => prev + 1);
        setHasMore(newPosts.length === 10);
      }
    } catch { 
      addToast('Failed to load posts.', 'error');
    } finally { 
      setLoading(false); 
    }
  }, [page, addToast]);

  useEffect(() => { loadPosts(true); }, []); // Only on mount

  const handleFileUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { url } = res.data;
      const isImage = file.type.startsWith('image/');
      setNewPost(p => ({
        ...p,
        imageUrl: isImage ? url : '',
        fileUrl: !isImage ? url : ''
      }));
      addToast('File uploaded successfully!', 'success');
    } catch {
      addToast('Failed to upload file.', 'error');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;
    setPosting(true);
    try {
      await api.post('/api/posts', newPost);
      addToast('Post shared with the community!', 'success');
      setNewPost({ content: '', illnessTag: 'ANXIETY', isAnonymous: false, imageUrl: '', fileUrl: '' });
      setShowCreate(false);
      loadPosts();
    } catch {
      addToast('Failed to post.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await api.post(`/api/communities/posts/${postId}/like`);
      loadPosts();
    } catch { }
  };

  const filteredPosts = filter === 'ALL' ? posts : posts.filter(p => p.illnessTag === filter);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafcfc]">
      {/* Background Orbs */}
      <div className="orb w-[600px] h-[600px] -top-100 -right-100" style={{ background: 'rgba(13,107,94,0.05)' }} />
      <div className="orb w-[500px] h-[500px] -bottom-100 -left-100" style={{ background: 'rgba(232,119,106,0.03)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black mb-2" style={{ color: '#1a3530' }}>
              SoulH <span style={{ color: '#0d6b5e' }}>Community</span>
            </h1>
            <p className="text-gray-500 font-medium max-w-md">
              A safe space to share your journey, find resources, and support fellow warriors.
            </p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-6 py-3 rounded-2xl font-bold shadow-lg transition active:scale-95 flex items-center gap-2"
            style={{ background: showCreate ? '#fee2e2' : '#0d6b5e', color: showCreate ? '#991b1b' : 'white' }}>
            {showCreate ? '✕ Cancel' : '✍️ Share Experience'}
          </button>
        </div>

        {/* Create Post Form */}
        {showCreate && (
          <div className="glass p-6 mb-10 animate-slide-down border-2 border-[#0d6b5e]/10">
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="relative">
                <textarea
                  value={newPost.content}
                  onChange={e => setNewPost(p => ({ ...p, content: e.target.value.slice(0, 500) }))}
                  placeholder="What's on your mind? Share your story, a question, or a resource..."
                  className="w-full min-h-[120px] p-4 bg-white/50 rounded-2xl border-2 border-teal-50 focus:border-[#0d6b5e]/20 focus:outline-none transition resize-none text-gray-700"
                />
                <div className="absolute bottom-3 right-4 text-[10px] font-bold" style={{ color: newPost.content.length >= 500 ? '#e11d48' : '#8aada5' }}>
                  {newPost.content.length}/500
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-teal-800">Illness Category</label>
                  <select value={newPost.illnessTag} onChange={e => setNewPost(p => ({ ...p, illnessTag: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-teal-100 bg-white/80 focus:outline-none text-xs font-bold text-gray-700">
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 border border-teal-50">
                   <div>
                     <p className="text-xs font-bold text-gray-800">Post Anonymously</p>
                     <p className="text-[10px] text-gray-400">Your identity will be hidden</p>
                   </div>
                   <input type="checkbox" checked={newPost.isAnonymous} onChange={e => setNewPost(p => ({ ...p, isAnonymous: e.target.checked }))}
                    className="w-5 h-5 accent-[#0d6b5e]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
                
                {/* File Preview */}
                {(newPost.imageUrl || newPost.fileUrl) && (
                  <div className="flex items-center justify-between p-3 bg-teal-50/50 rounded-xl border border-teal-100 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-teal-100 rounded flex items-center justify-center text-teal-600">
                        {newPost.imageUrl ? '🖼️' : '📎'}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-teal-800 uppercase tracking-tighter">Attached</p>
                        <p className="text-xs text-teal-600 truncate max-w-[200px]">
                          {newPost.imageUrl || newPost.fileUrl}
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setNewPost(p => ({ ...p, imageUrl: '', fileUrl: '' }))}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                   <button type="button" onClick={() => document.getElementById('file-upload').click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-100 transition">
                    📎 Attach File / PDF
                   </button>
                   <button type="button" onClick={() => document.getElementById('file-upload').click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-100 transition">
                    🖼️ Add Image
                   </button>
                </div>
              </div>

              <button type="submit" disabled={posting}
                className="w-full py-4 rounded-2xl font-black shadow-xl transition hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)', color: 'white' }}>
                {posting ? '⏳ Posting...' : '✓ Publish to Community'}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
           {['ALL', ...TAGS].map(t => (
             <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border shadow-sm ${filter === t ? 'bg-[#0d6b5e] text-white border-[#0d6b5e]' : 'bg-white text-gray-500 border-gray-100 hover:border-[#0d6b5e]/20'}`}>
               {t}
             </button>
           ))}
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-[#0d6b5e] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#8aada5] uppercase tracking-widest">Gathering Stories...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 glass">
              <div className="text-4xl mb-4">🍃</div>
              <p className="text-lg font-bold" style={{ color: '#1a3530' }}>The feed is quiet...</p>
              <p className="text-sm text-gray-400">Be the first to share your experience with the {filter !== 'ALL' ? filter : 'community'}!</p>
            </div>
          ) : (
            <>
              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} onLike={handleLike} />
              ))}
              {hasMore && (
                <button 
                  onClick={() => loadPosts(false)}
                  className="w-full py-4 glass-hover font-bold text-teal-600 animate-in fade-in slide-in-from-bottom-2"
                >
                  Load More Posts
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
