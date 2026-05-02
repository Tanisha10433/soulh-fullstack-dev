import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function ConsultationList() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, conRes] = await Promise.all([
        api.get('/api/doctor/requests'),
        api.get('/api/doctor/consultations')
      ]);
      setRequests(reqRes.data);
      setConsultations(conRes.data);
    } catch (err) {
      addToast('Failed to load activity.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRequest = async (id, action) => {
    try {
      await api.post(`/api/doctor/requests/${id}/${action}`);
      addToast(action === 'accept' ? 'Guidance request accepted! 🌿' : 'Request declined.', 'success');
      loadData();
    } catch {
      addToast('Operation failed.', 'error');
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.post(`/api/doctor/consultations/${id}/complete`);
      addToast('Conversation archived. ✅', 'success');
      loadData();
    } catch {
      addToast('Failed to update status.', 'error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f0faf8]">⏳ Syncing Support Activity...</div>;

  const upcoming = consultations.filter(c => c.status === 'CONFIRMED');
  const completed = consultations.filter(c => c.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 pt-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Guidance & Support Requests</h1>
            <p className="text-slate-500 font-medium mt-1">Manage new inquiries and ongoing support conversations.</p>
          </div>
          <button onClick={loadData} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-teal-50 hover:border-teal-200 transition-all shadow-sm">🔄</button>
        </header>

        <div className="glass rounded-[3rem] overflow-hidden border-white/60 shadow-2xl shadow-teal-900/5">
          <div className="flex border-b border-slate-100 bg-white/40 backdrop-blur-md">
            {[
              { id: 'REQUESTS', label: 'New Inquiries', count: requests.length, icon: '📩' },
              { id: 'UPCOMING', label: 'Ongoing Chats', count: upcoming.length, icon: '💬' },
              { id: 'HISTORY', label: 'Support History', count: completed.length, icon: '🌿' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-7 flex flex-col items-center gap-1.5 transition-all relative ${activeTab === tab.id ? 'text-teal-700 bg-white/80' : 'text-slate-400 hover:text-slate-600 hover:bg-white/20'}`}>
                <span className="text-2xl">{tab.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                {tab.count > 0 && <span className="absolute top-5 right-1/4 w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">{tab.count}</span>}
                {activeTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-teal-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          <div className="p-8 min-h-[450px]">
            {activeTab === 'REQUESTS' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <EmptyState icon="✉️" title="No New Inquiries" desc="New members seeking guidance will appear here." />
                ) : requests.map(req => (
                  <div key={req.id} className="p-7 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-black text-2xl shadow-inner border-2 border-white">
                        {req.patientName?.[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-lg">{req.patientName}</h4>
                        <p className="text-sm font-bold text-teal-600 mb-1">Seeking guidance for: {req.condition}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Sent on: {new Date(req.scheduledTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleRequest(req.id, 'reject')} className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition">Decline</button>
                      <button onClick={() => handleRequest(req.id, 'accept')} className="px-7 py-3 rounded-2xl bg-teal-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-teal-600/20 hover:scale-105 transition active:scale-95">Open Conversation</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'UPCOMING' && (
              <div className="space-y-4">
                {upcoming.length === 0 ? (
                  <EmptyState icon="💬" title="No Active Chats" desc="Confirmed support conversations will be listed here." />
                ) : upcoming.map(c => (
                  <div key={c.id} className="p-7 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shadow-inner border-2 border-white">
                        👤
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-lg">{c.patientName}</h4>
                        <p className="text-xs font-bold text-teal-600 mb-2">Topic: {c.condition || 'General Guidance'}</p>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100">Ongoing Chat</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleComplete(c.id)} className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-teal-50 hover:text-teal-600 transition">Archive</button>
                      <Link 
                        to={`/chat/${c.patientId}`} 
                        onClick={() => sessionStorage.setItem(`peer_${c.patientId}`, JSON.stringify({ id: c.patientId, name: c.patientName }))}
                        className="px-8 py-3 rounded-2xl bg-teal-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-teal-600/20 hover:scale-105 transition active:scale-95 flex items-center gap-2">
                         Enter Chat ➔
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'HISTORY' && (
              <div className="space-y-4">
                {completed.length === 0 ? (
                  <EmptyState icon="🌿" title="No History Yet" desc="Archived conversations will be stored here." />
                ) : completed.map(c => (
                  <div key={c.id} className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 flex items-center justify-between gap-4 group hover:bg-white transition-all cursor-default">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-lg shadow-sm">🌿</div>
                      <div>
                        <h4 className="font-bold text-slate-800">{c.patientName}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guidance Provided on {new Date(c.scheduledTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Link 
                      to={`/chat/${c.patientId}`} 
                      onClick={() => sessionStorage.setItem(`peer_${c.patientId}`, JSON.stringify({ id: c.patientId, name: c.patientName }))}
                      className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 hover:text-teal-600 hover:border-teal-200 transition shadow-sm">💬</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-6 opacity-10">{icon}</div>
      <h3 className="text-xl font-black text-slate-300">{title}</h3>
      <p className="text-slate-300 text-sm max-w-xs mx-auto mt-2 font-medium">{desc}</p>
    </div>
  );
}
