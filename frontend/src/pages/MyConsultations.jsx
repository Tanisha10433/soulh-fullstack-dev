import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

const STATUS_CONFIG = {
  CONFIRMED: { color: '#059669', bg: '#d1fae5', label: 'Confirmed', icon: '✅' },
  PENDING:   { color: '#d97706', bg: '#fef3c7', label: 'Pending',   icon: '⏳' },
  COMPLETED: { color: '#0d6b5e', bg: '#ccfbf1', label: 'Completed', icon: '🎉' },
  CANCELLED: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled', icon: '❌' },
};

export default function MyConsultations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const isDoctor = user?.role === 'DOCTOR';

  const loadConsultations = async () => {
    try {
      const res = await api.get('/api/consultations/my');
      setConsultations(res.data);
    } catch {
      addToast('Failed to load consultations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadConsultations();
  }, [user]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this consultation?')) return;
    try {
      await api.patch(`/api/consultations/${id}/cancel`);
      addToast('Consultation cancelled.', 'success');
      loadConsultations();
      setSelectedConsultation(null);
    } catch {
      addToast('Failed to cancel.', 'error');
    }
  };

  const handleSaveSummary = async (id) => {
    if (!summaryText.trim()) { addToast('Summary cannot be empty.', 'error'); return; }
    setSummaryLoading(true);
    try {
      await api.put(`/api/consultations/${id}/summary`, { summary: summaryText });
      addToast('Summary saved! Patient has been notified. ✅', 'success');
      loadConsultations();
      setSelectedConsultation(null);
    } catch {
      addToast('Failed to save summary.', 'error');
    } finally {
      setSummaryLoading(false);
    }
  };

  const now = new Date();
  const upcoming = consultations.filter(c => c.status === 'CONFIRMED' && new Date(c.scheduledAt) > now);
  const past     = consultations.filter(c => c.status === 'COMPLETED' || c.status === 'CANCELLED' || new Date(c.scheduledAt) < now);
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-0 right-0" style={{ background: 'rgba(13,107,94,0.1)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1a3530' }}>
              {isDoctor ? '🩺 My Consultations' : '📅 My Consultations'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8aada5' }}>
              {isDoctor ? 'Manage patient appointments and write summaries' : 'View upcoming and past appointments'}
            </p>
          </div>
          {!isDoctor && (
            <button onClick={() => navigate('/doctors')}
              className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={{ background: '#0d6b5e', color: 'white' }}>
              + Book New
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white/60 rounded-xl p-1 border border-teal-100 mb-6 w-fit shadow-sm">
          {['upcoming', 'past'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-2 text-xs font-bold rounded-lg capitalize transition"
              style={{ background: activeTab === tab ? '#0d6b5e' : 'transparent', color: activeTab === tab ? 'white' : '#0d6b5e' }}>
              {tab} ({tab === 'upcoming' ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        {/* List */}
        {displayed.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">{activeTab === 'upcoming' ? '📅' : '📜'}</p>
            <p className="font-bold text-lg" style={{ color: '#1a3530' }}>
              {activeTab === 'upcoming' ? 'No upcoming consultations' : 'No past consultations'}
            </p>
            {!isDoctor && activeTab === 'upcoming' && (
              <button onClick={() => navigate('/doctors')}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#0d6b5e', color: 'white' }}>
                Browse Doctors
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(c => (
              <ConsultationCard
                key={c.id}
                consultation={c}
                isDoctor={isDoctor}
                onViewDetails={() => { setSelectedConsultation(c); setSummaryText(c.doctorSummary || ''); }}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedConsultation(null)}>
          <div className="glass p-0 overflow-hidden w-full max-w-lg flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-teal-100 flex justify-between items-start bg-white/50">
              <div>
                <h3 className="font-black text-lg" style={{ color: '#1a3530' }}>
                  Consultation Details
                </h3>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#0d6b5e' }}>
                  {isDoctor ? `Patient: ${selectedConsultation.patientName}` : `Dr. ${selectedConsultation.doctorName}`}
                </p>
              </div>
              <button onClick={() => setSelectedConsultation(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Time */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(13,107,94,0.06)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#8aada5' }}>Scheduled Time</p>
                <p className="font-semibold text-sm" style={{ color: '#1a3530' }}>
                  {new Date(selectedConsultation.scheduledAt).toLocaleString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Video Link */}
              {selectedConsultation.meetingUrl && selectedConsultation.status === 'CONFIRMED' && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(13,107,94,0.08)' }}>
                  <span className="text-2xl">🎥</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: '#0d6b5e' }}>Video Room</p>
                    <p className="text-xs font-mono truncate" style={{ color: '#64748b' }}>{selectedConsultation.meetingUrl}</p>
                  </div>
                  <a href={selectedConsultation.meetingUrl} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                    style={{ background: '#0d6b5e', color: 'white' }}>
                    Join Call
                  </a>
                </div>
              )}

              {/* Summary (Doctor writes / Patient reads) */}
              {isDoctor && selectedConsultation.status !== 'CANCELLED' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#0d6b5e' }}>
                    📝 Post-Consultation Summary
                  </label>
                  <textarea
                    value={summaryText}
                    onChange={e => setSummaryText(e.target.value)}
                    placeholder="Write key findings, prescriptions, follow-up notes..."
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none focus:ring-2 transition"
                    style={{ border: '1px solid rgba(13,107,94,0.2)', color: '#1a3530' }}
                  />
                  <button onClick={() => handleSaveSummary(selectedConsultation.id)}
                    disabled={summaryLoading}
                    className="mt-2 w-full py-2.5 rounded-xl text-sm font-bold transition"
                    style={{ background: '#0d6b5e', color: 'white' }}>
                    {summaryLoading ? '⏳ Saving...' : '✓ Save Summary & Mark Complete'}
                  </button>
                </div>
              ) : (
                selectedConsultation.doctorSummary && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#0d6b5e' }}>
                      📋 Doctor's Summary
                    </p>
                    <p className="text-sm p-4 rounded-xl leading-relaxed"
                      style={{ background: 'rgba(13,107,94,0.05)', color: '#374151', border: '1px solid rgba(13,107,94,0.12)' }}>
                      {selectedConsultation.doctorSummary}
                    </p>
                  </div>
                )
              )}

              {/* Cancel */}
              {selectedConsultation.status === 'CONFIRMED' && (
                <button onClick={() => handleCancel(selectedConsultation.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ background: '#fee2e2', color: '#dc2626' }}>
                  Cancel Consultation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultationCard({ consultation: c, isDoctor, onViewDetails, onCancel }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;
  const scheduledDate = new Date(c.scheduledAt);
  const isJoinable = c.status === 'CONFIRMED' && Math.abs(Date.now() - scheduledDate.getTime()) < 30 * 60 * 1000;
  
  // Who to message: doctor messages patient, patient messages doctor
  const chatPartnerId = isDoctor ? c.patientId : c.doctorId;
  const chatPartnerName = isDoctor ? c.patientName : c.doctorName;

  return (
    <div className="glass p-5 hover:-translate-y-0.5 transition-all"
      style={{ borderRadius: '20px' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: cfg.bg }}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm truncate" style={{ color: '#1a3530' }}>
              {isDoctor ? `Patient: ${c.patientName || 'Unknown'}` : `Dr. ${c.doctorName || 'Unknown'}`}
            </p>
            {(isDoctor ? c.patientIllness : c.doctorSpecialization) && (
              <p className="text-xs font-medium" style={{ color: '#0d6b5e' }}>
                {isDoctor ? c.patientIllness : c.doctorSpecialization}
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: '#8aada5' }}>
              {scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}
              {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        {isJoinable && c.meetingUrl && (
          <a href={c.meetingUrl} target="_blank" rel="noreferrer"
            className="flex-1 py-2 rounded-xl text-xs font-bold text-center transition animate-pulse-slow"
            style={{ background: '#0d6b5e', color: 'white' }}>
            🎥 Join Call Now
          </a>
        )}
        {/* Message button — always show for CONFIRMED/COMPLETED and when chatPartnerId is known */}
        {chatPartnerId && c.status !== 'CANCELLED' && (
          <button
            onClick={() => {
              if (chatPartnerName) {
                sessionStorage.setItem(`peer_${chatPartnerId}`, JSON.stringify({
                  id: chatPartnerId,
                  name: isDoctor ? chatPartnerName : `Dr. ${chatPartnerName}`,
                }));
              }
              navigate(`/chat/${chatPartnerId}`);
            }}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition"
            style={{ background: 'rgba(13,107,94,0.12)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
            💬 {isDoctor ? 'Message Patient' : 'Message Doctor'}
          </button>
        )}
        <button onClick={onViewDetails}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition"
          style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.15)' }}>
          {isDoctor ? '📝 Details / Summary' : '📄 View Details'}
        </button>
      </div>

      {c.amountPaid && c.status !== 'CANCELLED' && (
        <p className="text-[10px] mt-2 font-medium" style={{ color: '#8aada5' }}>
          Paid: ₹{c.amountPaid} · {c.razorpayPaymentId || 'Demo payment'}
        </p>
      )}
    </div>
  );
}
