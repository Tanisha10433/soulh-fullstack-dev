import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeConsultations: 0,
    pendingRequests: 0,
    completedSessions: 0
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Trying to fetch from the /api/doctor/dashboard endpoint
      const res = await api.get('/api/doctor/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error("Dashboard load failed", err);
      // Fallback to zeros so the UI doesn't crash or stay empty
      addToast('Syncing your activity...', 'info');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') {
      navigate('/login');
      return;
    }
    loadDashboard();
  }, [user, navigate, loadDashboard]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 font-bold text-teal-800 animate-pulse">Entering Support Portal...</p>
    </div>
  );

  const displayName = user.name?.toLowerCase().startsWith('dr.') ? user.name : `Dr. ${user.name}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 overflow-x-hidden">
      {/* Background Decor - More organic */}
      <div className="fixed top-[-10%] right-[-10%] w-[800px] h-[800px] bg-teal-50/50 blur-[150px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50/40 blur-[120px] rounded-full -z-10" />

      <div className="max-w-6xl mx-auto px-6 pt-12">
        
        {/* Welcome Hero Section - Reduces "Empty Space" */}
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-10 md:p-16 mb-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl -mr-48 -mt-48 rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl -ml-32 -mb-32 rounded-full" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white/10 bg-gradient-to-br from-teal-400 to-teal-600 shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">Welcome back, {displayName}</h1>
              <p className="text-teal-400 font-bold text-lg">{user.specialization || 'Chronic Care Specialist'} • SoulH Expert Guide</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                <Link to="/doctor/profile" className="px-6 py-2.5 rounded-2xl bg-white/10 text-white border border-white/20 text-xs font-black uppercase tracking-widest hover:bg-white/20 transition">Manage Bio</Link>
                <button onClick={loadDashboard} className="px-6 py-2.5 rounded-2xl bg-teal-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:scale-105 transition active:scale-95">Sync Activity</button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row - More rectangular, less "Square/Empty" */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Members', value: stats.totalPatients, icon: '🤝', color: 'text-blue-500' },
            { label: 'Active Chats', value: stats.activeConsultations, icon: '💬', color: 'text-emerald-500' },
            { label: 'New Requests', value: stats.pendingRequests, icon: '📩', color: 'text-amber-500' },
            { label: 'Help History', value: stats.completedSessions, icon: '✨', color: 'text-indigo-500' },
          ].map(s => (
            <div key={s.label} className="glass p-8 rounded-[2.5rem] border-white/60 flex flex-col items-center md:items-start group hover:shadow-xl transition-all duration-300">
              <span className="text-3xl mb-4">{s.icon}</span>
              <p className="text-3xl font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Activity Area */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ActionCard 
                title="Active Conversations" 
                desc="Chat with members seeking expert guidance and validation."
                icon="💬"
                link="/doctor/consultations"
                color="bg-teal-50 text-teal-600"
              />
              <ActionCard 
                title="Expert Insights" 
                desc="Share wellness tips to educate and support the whole community."
                icon="💡"
                link="/doctor/content"
                color="bg-purple-50 text-purple-600"
              />
            </div>

            {/* Quick Summary Section */}
            <div className="glass p-10 rounded-[3rem] border-white/60">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800">Support Resources</h3>
                <Link to="/doctor/content" className="text-xs font-black text-teal-600 hover:underline">View All →</Link>
              </div>
              <div className="space-y-4">
                <ToolItem icon="🌟" title="Community Feedback" desc="See how your guidance is helping members in their journey." />
                <ToolItem icon="📢" title="Broadcast Support" desc="Send a gentle wellness tip to all connected peers." />
                <ToolItem icon="🔒" title="Private & Secure" desc="Conversations are end-to-end encrypted for safety." />
              </div>
            </div>
          </div>

          {/* Sidebar / Secondary Tools */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass p-8 rounded-[3rem] border-white/60 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full mb-6 flex items-center justify-center text-3xl font-black text-white shadow-2xl bg-gradient-to-br from-teal-400 to-teal-600 border-4 border-white">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-1">{displayName}</h4>
              <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-6">{user.specialization || 'Support Expert'}</p>
              <div className="w-full pt-6 border-t border-slate-100">
                <Link to="/doctor/profile" className="block w-full py-4 rounded-2xl bg-teal-50 text-teal-700 text-[11px] font-black uppercase tracking-widest hover:bg-teal-600 hover:text-white transition shadow-sm">
                  Update Public Bio
                </Link>
              </div>
            </div>

            <div className="bg-teal-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group cursor-default">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-teal-100 mb-6">Expert Ethics</h4>
              <p className="text-lg font-medium leading-relaxed italic opacity-90">
                "Our role is to listen, validate, and guide. Clinical expertise meets human empathy."
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">🌿</div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">SoulH Standard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, icon, link, color }) {
  return (
    <Link to={link} className="glass p-8 rounded-[2.5rem] border-white/60 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 ${color} shadow-inner`}>
        {icon}
      </div>
      <h3 className="font-black text-slate-800 text-lg mb-2 group-hover:text-teal-600 transition-colors">{title}</h3>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
    </Link>
  );
}

function ToolItem({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-5 p-6 rounded-3xl hover:bg-white/50 transition border border-transparent hover:border-teal-50/50">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 font-medium">{desc}</p>
      </div>
      <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
    </div>
  );
}
