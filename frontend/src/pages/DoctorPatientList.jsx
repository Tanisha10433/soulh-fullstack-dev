import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function DoctorPatientList() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/doctor/patients');
      setPatients(res.data);
    } catch {
      addToast('Failed to load patient list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const filtered = patients.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.condition?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">⏳ Accessing Patient Registry...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Patient Management</h1>
            <p className="text-slate-500 font-medium mt-1">Registry of all patients consulted under your care.</p>
          </div>
          <div className="relative w-full md:w-96">
            <input type="text" placeholder="Search by name or condition..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition shadow-sm"
            />
            <span className="absolute left-4 top-3.5 text-xl grayscale opacity-40">🔍</span>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-[2.5rem] border-white/40">
            <div className="text-6xl mb-6 grayscale opacity-20">👥</div>
            <h3 className="text-xl font-black text-slate-400">No Patients Found</h3>
            <p className="text-slate-400 text-sm mt-2 font-medium">Patients will appear here after their first consultation session.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="glass p-6 rounded-[2rem] border-white/40 hover:shadow-xl transition group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-black shadow-inner uppercase">
                    {p.name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg group-hover:text-teal-700 transition-colors">{p.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Registry ID: {p.id.slice(-6)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 mb-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-teal-800 mb-1">Primary Condition</p>
                  <p className="text-xs font-bold text-teal-700">{p.condition || 'General Consult'}</p>
                </div>

                <div className="flex gap-3">
                  <Link to={`/chat?recipient=${p.id}`} className="flex-1 py-3 rounded-xl bg-teal-700 text-white text-[11px] font-black uppercase tracking-widest text-center shadow-lg shadow-teal-700/20 hover:scale-105 transition active:scale-95">Chat</Link>
                  <button className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition">View History</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
