import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'ADMIN') { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = () => {
    api.get('/api/admin/pending').then(r => setPending(r.data)).catch(() => {});
    api.get('/api/admin/approved').then(r => setApproved(r.data)).catch(() => {});
  };

  const handleAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/api/admin/verify/${id}`, { action });
      loadData();
    } catch {
      alert('Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-0 right-[-100px]" style={{ background: 'rgba(13,107,94,0.12)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-0" style={{ background: 'rgba(232,119,106,0.08)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="glass p-7">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#db2777,#be185d)' }}>👑</div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1a3530' }}>Admin Dashboard</h1>
              <p className="text-sm" style={{ color: '#8aada5' }}>{user?.name} · Platform Management</p>
            </div>
            <div className="ml-auto">
              <span className="badge badge-indigo">✓ Admin Role</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '⏳', label: 'Pending Verifications',  value: pending.length,  color: '#f59e0b' },
              { icon: '✅', label: 'Approved Doctors', value: approved.length, color: '#059669' },
              { icon: '🏥', label: 'Total Applications',    value: pending.length + approved.length, color: '#0d6b5e' },
            ].map(s => (
              <div key={s.label} className="text-center p-4 rounded-2xl"
                style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.1)' }}>
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-semibold uppercase tracking-widest mt-1" style={{ color: '#8aada5' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="glass p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(232,119,106,0.1)' }}>⏳</div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1a3530' }}>Pending Verifications</h2>
                <p className="text-xs" style={{ color: '#8aada5' }}>{pending.length} awaiting review</p>
              </div>
            </div>
            <button onClick={loadData} className="text-sm font-semibold transition hover:underline" style={{ color: '#0d6b5e' }}>↻ Refresh</button>
          </div>

          {pending.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">🎉</p>
              <p className="font-semibold" style={{ color: '#1a3530' }}>No pending verifications</p>
              <p className="text-sm mt-1" style={{ color: '#8aada5' }}>All caught up! Great work.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(v => (
                <div key={v.id} className="flex items-center justify-between p-5 rounded-2xl"
                  style={{ background: 'rgba(13,107,94,0.04)', border: '1px solid rgba(13,107,94,0.12)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
                      {v.doctor?.name?.[0]?.toUpperCase() || 'D'}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: '#1a3530' }}>{v.doctor?.name || 'Doctor'} <span className="text-sm font-normal text-slate-500">({v.doctor?.illnessCondition || 'General'})</span></p>
                      <p className="text-xs mb-1" style={{ color: '#8aada5' }}>{v.doctor?.email}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(13,107,94,0.1)', color: '#0d6b5e' }}>
                        ID: {v.registrationNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button id={`approve-${v.id}`} onClick={() => handleAction(v.id, 'APPROVE')}
                      disabled={actionLoading[v.id]}
                      className="px-4 py-2 text-sm font-bold rounded-xl transition"
                      style={{ background: 'rgba(5,150,105,0.1)', color: '#047857', border: '1px solid rgba(5,150,105,0.22)' }}>
                      {actionLoading[v.id] ? '...' : '✓ Approve'}
                    </button>
                    <button id={`reject-${v.id}`} onClick={() => handleAction(v.id, 'REJECT')}
                      disabled={actionLoading[v.id]}
                      className="px-4 py-2 text-sm font-bold rounded-xl transition"
                      style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
