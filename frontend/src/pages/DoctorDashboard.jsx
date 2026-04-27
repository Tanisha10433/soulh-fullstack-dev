import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

// ─── Availability Manager ─────────────────────────────────────────────────────
function AvailabilityManager() {
  const { addToast } = useToast();
  const [slots, setSlots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ startTime: '', endTime: '' });
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      const res = await api.get('/api/availability/mine');
      setSlots(res.data);
    } catch { setSlots([]); }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleAdd = async () => {
    if (!form.startTime || !form.endTime) { addToast('Fill in both times.', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/api/availability', {
        startTime: new Date(form.startTime).toISOString().replace('Z', ''),
        endTime:   new Date(form.endTime).toISOString().replace('Z', ''),
      });
      addToast('Slot added!', 'success');
      setForm({ startTime: '', endTime: '' });
      setShowForm(false);
      loadSlots();
    } catch { addToast('Failed to add slot.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/availability/${id}`);
      addToast('Slot removed.', 'success');
      loadSlots();
    } catch { addToast('Failed to remove.', 'error'); }
  };

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: '#1a3530' }}>🗓️ Availability Slots</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
          style={{ background: showForm ? '#fee2e2' : 'rgba(13,107,94,0.1)', color: showForm ? '#dc2626' : '#0d6b5e' }}>
          {showForm ? '✕ Cancel' : '+ Add Slot'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-3 p-3 rounded-xl" style={{ background: 'rgba(13,107,94,0.05)', border: '1px dashed rgba(13,107,94,0.2)' }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#0d6b5e' }}>Start Time</label>
            <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
              style={{ border: '1px solid rgba(13,107,94,0.2)', color: '#1a3530' }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#0d6b5e' }}>End Time</label>
            <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
              style={{ border: '1px solid rgba(13,107,94,0.2)', color: '#1a3530' }} />
          </div>
          <button onClick={handleAdd} disabled={saving}
            className="w-full py-2 rounded-xl text-xs font-bold"
            style={{ background: '#0d6b5e', color: 'white' }}>
            {saving ? '⏳' : '✓ Add Slot'}
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {slots.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#8aada5' }}>No slots yet. Add some for patients to book!</p>
        ) : slots.map(s => {
          const start = new Date(s.startTime);
          const end   = new Date(s.endTime);
          return (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl"
              style={{ background: s.isBooked ? 'rgba(220,38,38,0.05)' : 'rgba(13,107,94,0.05)', border: '1px solid rgba(13,107,94,0.1)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: '#1a3530' }}>
                  {start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[10px]" style={{ color: '#8aada5' }}>
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: s.isBooked ? '#fee2e2' : '#d1fae5', color: s.isBooked ? '#dc2626' : '#059669' }}>
                  {s.isBooked ? 'Booked' : 'Open'}
                </span>
                {!s.isBooked && (
                  <button onClick={() => handleDelete(s.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition"
                    style={{ background: '#fee2e2', color: '#dc2626' }}>✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Doctor Profile Card ───────────────────────────────────────────────────────
function DoctorProfileCard({ onProfileUpdate }) {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', specialization: '', experience: '', qualification: '', hospital: ''
  });

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/doctor/profile');
      setProfile(res.data);
      setForm({
        name:           res.data.name           || '',
        specialization: res.data.specialization || '',
        experience:     String(res.data.experience || ''),
        qualification:  res.data.qualification  || '',
        hospital:       res.data.hospital       || '',
      });
    } catch {
      // fallback to auth context user data
      if (user) {
        setProfile({
          name:           user.name           || '',
          email:          user.email          || '',
          specialization: user.illnessCondition || '',
          experience:     user.experience     || 0,
          qualification:  user.qualification  || '',
          hospital:       user.hospital       || '',
          isVerified:     user.verified       || false,
        });
      }
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/doctor/profile/update', form);
      await loadProfile();
      onProfileUpdate?.();
      addToast('Profile updated successfully! ✅', 'success');
      setIsEditing(false);
    } catch {
      addToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return (
    <div className="glass p-7 text-center animate-pulse">
      <div className="w-20 h-20 mx-auto rounded-full bg-teal-100 mb-4" />
      <div className="h-4 bg-teal-100 rounded w-2/3 mx-auto mb-2" />
      <div className="h-3 bg-teal-50 rounded w-1/2 mx-auto" />
    </div>
  );

  const initials = (profile.name || 'D').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="glass overflow-hidden" style={{ borderRadius: '20px' }}>
      {/* Banner */}
      <div className="h-20 relative" style={{
        background: 'linear-gradient(135deg, #0d6b5e 0%, #0f8b7a 50%, #1aab98 100%)'
      }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Avatar */}
      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl border-4 border-white"
            style={{ background: 'linear-gradient(135deg, #0d6b5e, #0f8b7a)' }}>
            {initials}
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
              style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setIsEditing(false); loadProfile(); }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#64748b' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                style={{ background: '#0d6b5e', color: 'white' }}>
                {saving ? <span className="animate-spin">⏳</span> : '✓'} Save
              </button>
            </div>
          )}
        </div>

        {/* Name & Verification */}
        {!isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-black text-xl" style={{ color: '#1a3530' }}>Dr. {profile.name}</h3>
              {profile.isVerified ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: '#d1fae5', color: '#065f46' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Doctor
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: '#f3f4f6', color: '#6b7280' }}>
                  ⏳ Pending Verification
                </span>
              )}
            </div>
            <p className="text-sm font-medium mb-4" style={{ color: '#0d6b5e' }}>
              {profile.specialization || 'No specialization set'}
            </p>

            {/* Info Grid */}
            <div className="space-y-2.5">
              {[
                { icon: '🏆', label: 'Experience', value: profile.experience ? `${profile.experience} Years` : 'Not set' },
                { icon: '🎓', label: 'Qualification', value: profile.qualification || 'Not set' },
                { icon: '🏥', label: 'Hospital / Clinic', value: profile.hospital || 'Not set' },
                { icon: '📧', label: 'Email', value: profile.email },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(13,107,94,0.04)', border: '1px solid rgba(13,107,94,0.08)' }}>
                  <span className="text-base mt-0.5">{icon}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8aada5' }}>{label}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: '#1a3530' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {!profile.isVerified && (
              <div className="mt-4 p-3 rounded-xl text-center"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)' }}>
                <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
                  Complete KYC to get verified ✓
                </p>
              </div>
            )}
          </>
        ) : (
          /* ─── Edit Form ─── */
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8aada5' }}>
              ✏️ Edit Your Profile
            </p>
            {[
              { key: 'name', label: 'Full Name', placeholder: 'Dr. Jane Smith', type: 'text' },
              { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Cardiology, Neurology', type: 'text' },
              { key: 'experience', label: 'Experience (years)', placeholder: 'e.g. 8', type: 'number' },
              { key: 'qualification', label: 'Qualification', placeholder: 'e.g. MBBS, MD, DM', type: 'text' },
              { key: 'hospital', label: 'Hospital / Clinic', placeholder: 'Apollo Hospital, Mumbai', type: 'text' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: '#0d6b5e' }}>{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 transition"
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(13,107,94,0.2)',
                    color: '#1a3530',
                    focusRingColor: '#0d6b5e'
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main DoctorDashboard ─────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ totalPatients: 0, pendingRequests: 0, approvedUsers: 0 });
  const [pendingPatients, setPendingPatients] = useState([]);
  const [historyPatients, setHistoryPatients] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'DOCTOR') { navigate('/dashboard'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, historyRes, statsRes] = await Promise.all([
        api.get('/api/doctor/patient-verifications'),
        api.get('/api/doctor/patient-history'),
        api.get('/api/doctor/dashboard-stats')
      ]);
      setPendingPatients(pendingRes.data);
      setHistoryPatients(historyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, e) => {
    if (e) e.stopPropagation();
    if (action === 'REJECT') {
      const confirmed = window.confirm('Are you sure you want to reject this patient?');
      if (!confirmed) return;
    }
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/api/doctor/verify-patient/${id}`, { action });
      addToast(`Patient ${action.toLowerCase()}ed successfully.`, 'success');
      loadData();
      if (selectedPatient?.id === id) setSelectedPatient(null);
    } catch {
      addToast('Action failed. Note: you cannot verify yourself.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl animate-pulse"
          style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>🩺</div>
        <p className="font-semibold" style={{ color: '#1a3530' }}>Loading Doctor Portal...</p>
      </div>
    </div>
  );

  const activeList = activeTab === 'PENDING' ? pendingPatients : historyPatients;
  const filteredList = activeList.filter(p =>
    p.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.patient?.illnessCondition || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-0 right-[-100px]" style={{ background: 'rgba(13,107,94,0.12)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-0" style={{ background: 'rgba(232,119,106,0.08)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stats */}
          <div className="glass p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1a3530' }}>
              <span>📊</span> Overview
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: '😷', label: 'Total Patients',   value: stats.totalPatients,   color: '#0d6b5e' },
                { icon: '⏳', label: 'Pending Requests', value: stats.pendingRequests, color: '#f59e0b' },
                { icon: '✅', label: 'Verified Patients', value: stats.approvedUsers,  color: '#059669' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-2xl transition hover:-translate-y-0.5"
                  style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.1)' }}>
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: '#8aada5' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Queue */}
          <div className="glass p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1a3530' }}>
                <span>📋</span> Patient Verifications
              </h2>
              <div className="flex bg-white/50 rounded-xl p-1 border border-teal-100 shadow-sm">
                {['PENDING', 'HISTORY'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-teal-700 text-white shadow-md' : 'text-teal-800'}`}>
                    {tab === 'PENDING' ? `Pending (${pendingPatients.length})` : `History (${historyPatients.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(13,107,94,0.15)', color: '#1a3530' }}
              />
              <svg className="absolute left-3 top-3 w-4 h-4" fill="none" stroke="#8aada5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {filteredList.length === 0 ? (
              <div className="text-center py-12 opacity-60">
                <p className="text-4xl mb-2">🎉</p>
                <p className="font-semibold text-sm" style={{ color: '#1a3530' }}>
                  {activeTab === 'PENDING' ? 'No pending requests!' : 'No history yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map(p => (
                  <div key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition hover:-translate-y-0.5"
                    style={{ background: 'rgba(13,107,94,0.04)', border: '1px solid rgba(13,107,94,0.12)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
                        {p.patient?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm flex items-center gap-2" style={{ color: '#1a3530' }}>
                          {p.patient?.name}
                          {p.status === 'APPROVED' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#d1fae5', color: '#065f46' }}>VERIFIED</span>}
                          {p.status === 'REJECTED' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>REJECTED</span>}
                        </p>
                        <p className="text-xs font-medium" style={{ color: '#0d6b5e' }}>{p.patient?.illnessCondition}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#8aada5' }}>
                          Submitted: {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {p.status === 'PENDING' && (
                        <>
                          <button onClick={e => handleAction(p.id, 'APPROVE', e)} disabled={actionLoading[p.id]}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl transition"
                            style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                            {actionLoading[p.id] ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={e => handleAction(p.id, 'REJECT', e)} disabled={actionLoading[p.id]}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl transition"
                            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                            ✕ Reject
                          </button>
                        </>
                      )}
                      <button className="px-3 py-1.5 text-xs font-bold rounded-xl transition"
                        style={{ background: 'rgba(255,255,255,0.9)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Doctor Profile Card ── */}
        <div className="space-y-4">
          <DoctorProfileCard onProfileUpdate={loadData} />
          
          <AvailabilityManager />

          {/* Quick Actions */}
          <div className="glass p-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#1a3530' }}>⚡ Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: '📅', label: 'My Appointments', action: () => navigate('/consultations') },
                { icon: '🩺', label: 'View Pending Queue', action: () => setActiveTab('PENDING') },
                { icon: '📜', label: 'Verification History', action: () => setActiveTab('HISTORY') },
                { icon: '🎓', label: 'Complete KYC', action: () => navigate('/doctor/onboarding') },
              ].map(({ icon, label, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition hover:-translate-y-0.5 text-left"
                  style={{ background: 'rgba(13,107,94,0.05)', color: '#1a3530', border: '1px solid rgba(13,107,94,0.1)' }}>
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Patient Details Modal ── */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPatient(null)}>
          <div className="glass p-0 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-teal-100 flex justify-between items-start bg-white/50">
              <div>
                <h3 className="text-xl font-black" style={{ color: '#1a3530' }}>{selectedPatient.patient?.name}</h3>
                <p className="text-sm font-semibold" style={{ color: '#0d6b5e' }}>{selectedPatient.patient?.illnessCondition}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-bold">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white/40 space-y-5">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-teal-800 mb-2">Patient Bio</h4>
                <p className="text-sm p-4 bg-white rounded-xl border border-teal-100 shadow-sm leading-relaxed text-gray-700">
                  {selectedPatient.patient?.bio || "This patient hasn't provided a biography yet."}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-teal-800 mb-2">Uploaded Proof</h4>
                <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 min-h-[250px] flex items-center justify-center">
                  {selectedPatient.proofUrl
                    ? <img src={selectedPatient.proofUrl} alt="Medical Proof" className="max-w-full max-h-[500px] object-contain" />
                    : <p className="text-gray-400 text-sm">No document uploaded</p>
                  }
                </div>
              </div>
            </div>
            {selectedPatient.status === 'PENDING' && (
              <div className="p-4 bg-white/80 border-t border-teal-100 flex gap-3 justify-end">
                <button onClick={() => handleAction(selectedPatient.id, 'REJECT')}
                  disabled={actionLoading[selectedPatient.id]}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition"
                  style={{ background: '#fee2e2', color: '#991b1b' }}>
                  ✕ Reject
                </button>
                <button onClick={() => handleAction(selectedPatient.id, 'APPROVE')}
                  disabled={actionLoading[selectedPatient.id]}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-md"
                  style={{ background: '#0d6b5e', color: 'white' }}>
                  ✓ Approve Patient
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
