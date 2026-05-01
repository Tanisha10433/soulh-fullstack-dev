import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function BookConsultation() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState(1); // 1=select slot, 2=context, 3=sent
  
  const [condition, setCondition] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get(`/api/users/${doctorId}`),
      // For now using a simple availability check or just showing a prompt to request a time
    ]).then(([dRes]) => {
      setDoctor(dRes.data);
      // Dummy slots for now to keep it conversation-first
      setSlots([
        { id: '1', startTime: new Date().setHours(10, 0, 0, 0), endTime: new Date().setHours(10, 30, 0, 0) },
        { id: '2', startTime: new Date().setHours(11, 0, 0, 0), endTime: new Date().setHours(11, 30, 0, 0) },
        { id: '3', startTime: new Date().setHours(15, 0, 0, 0), endTime: new Date().setHours(15, 30, 0, 0) },
      ]);
    }).catch(() => addToast('Failed to load doctor info.', 'error'))
      .finally(() => setLoading(false));
  }, [doctorId, user, addToast, navigate]);

  const handleSendRequest = async () => {
    if (!selectedSlot) { addToast('Please pick a time for the initial chat.', 'error'); return; }
    if (!condition.trim()) { addToast('Please share what you are experiencing.', 'error'); return; }
    
    setBooking(true);
    try {
      // In a support-first model, this creates a 'Guidance Request'
      await api.post('/api/doctor/requests', {
        doctorId: doctorId,
        condition: condition,
        scheduledTime: new Date(selectedSlot.startTime).toISOString()
      });

      setStep(3);
      addToast('Guidance request sent! 🌿', 'success');
    } catch (err) {
      addToast('Failed to send request.', 'error');
    } finally {
      setBooking(false);
    }
  };

  const formatSlotTime = slot => {
    const start = new Date(slot.startTime);
    return {
      date: start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Connecting with expert...</p>
    </div>
  );

  if (!doctor) return <div className="min-h-screen flex items-center justify-center text-slate-400">Expert not found.</div>;

  return (
    <div className="min-h-screen relative bg-[#f8fafc] pb-20">
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-teal-50 blur-[100px] rounded-full -z-10" />

      <div className="max-w-4xl mx-auto px-6 pt-24 relative z-10">
        <button onClick={() => navigate('/doctors')} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-teal-700 mb-10 hover:gap-3 transition-all">
          ← Back to Experts
        </button>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Expert Info Sidebar */}
          <div className="lg:w-1/3">
            <div className="glass p-8 rounded-[2.5rem] text-center border-white/60 shadow-xl shadow-teal-900/5 sticky top-24">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white shadow-xl bg-gradient-to-br from-teal-500 to-teal-700 border-4 border-white">
                {doctor.name?.[0]?.toUpperCase()}
              </div>
              <h2 className="text-xl font-black text-slate-800">{doctor.name?.toLowerCase().startsWith('dr.') ? doctor.name : `Dr. ${doctor.name}`}</h2>
              <p className="text-teal-600 text-sm font-bold mt-1 mb-6">{doctor.illnessCondition}</p>
              
              <div className="space-y-4 text-left border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛡️</span>
                  <p className="text-[11px] font-bold text-slate-500 leading-tight">Verified Expert providing validation & support.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <p className="text-[11px] font-bold text-slate-500 leading-tight">Direct chat access for personalized guidance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Request Form */}
          <div className="lg:w-2/3">
            <div className="glass p-10 rounded-[3rem] border-white/60 shadow-2xl shadow-teal-900/5">
              
              {step < 3 ? (
                <>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Request Expert Guidance</h1>
                    <p className="text-slate-500 text-sm font-medium mt-2">Start a conversation with {doctor.name?.toLowerCase().startsWith('dr.') ? doctor.name : `Dr. ${doctor.name}`} for validation and advice.</p>

                  <div className="space-y-10">
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-widest text-teal-800 mb-6 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-[10px]">1</span>
                        Pick a preferred time for your initial chat
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {slots.map(slot => {
                          const { date, time } = formatSlotTime(slot);
                          const isSelected = selectedSlot?.id === slot.id;
                          return (
                            <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                              className={`p-4 rounded-2xl text-left transition-all border-2 ${isSelected ? 'bg-teal-600 border-teal-600 shadow-lg shadow-teal-600/20' : 'bg-white border-slate-100 hover:border-teal-200'}`}>
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>{date}</p>
                              <p className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{time}</p>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-black uppercase tracking-widest text-teal-800 mb-6 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-[10px]">2</span>
                        How can the doctor support you?
                      </h3>
                      <textarea 
                        value={condition}
                        onChange={e => setCondition(e.target.value)}
                        placeholder="Share a little about what you're experiencing or what guidance you seek..."
                        className="w-full p-6 rounded-3xl text-sm bg-white border border-slate-100 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all min-h-[150px]"
                      />
                      <p className="text-[10px] text-slate-400 font-medium mt-3 ml-2 italic">This helps the doctor prepare for your conversation.</p>
                    </section>

                    <button onClick={handleSendRequest} disabled={booking}
                      className="w-full py-5 rounded-[2rem] bg-teal-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      {booking ? 'Sending Request...' : 'Send Guidance Request'}
                      <span>➔</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner border-2 border-white">
                    🌿
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Request Sent Successfully</h3>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    {doctor.name?.toLowerCase().startsWith('dr.') ? doctor.name : `Dr. ${doctor.name}`} will review your request. You'll be notified as soon as the conversation is ready to begin.
                  </p>
                  
                  <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => navigate('/consultations')} className="px-10 py-4 rounded-2xl bg-teal-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-teal-600/20 transition">View My Requests</button>
                    <button onClick={() => navigate('/doctors')} className="px-10 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[11px] transition">Back to Directory</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
