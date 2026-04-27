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
  const [step, setStep] = useState(1); // 1=select slot, 2=payment, 3=confirmed
  const [confirmedConsultation, setConfirmedConsultation] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get(`/api/doctors/${doctorId}`),
      api.get(`/api/availability/${doctorId}`)
    ]).then(([dRes, sRes]) => {
      setDoctor(dRes.data);
      setSlots(sRes.data);
    }).catch(() => addToast('Failed to load doctor info.', 'error'))
      .finally(() => setLoading(false));
  }, [doctorId, user]);

  const handlePayAndBook = async () => {
    if (!selectedSlot) { addToast('Please select a time slot.', 'error'); return; }
    setBooking(true);
    try {
      // 1. Create payment order
      const orderRes = await api.post('/api/payment/create-order', { slotId: selectedSlot.id });
      const { orderId, amount, keyId, description } = orderRes.data;

      // 2. For demo: skip real Razorpay if using placeholder key; otherwise open popup
      if (keyId && !keyId.includes('REPLACE')) {
        // Real Razorpay integration
        await openRazorpay({ orderId, amount, keyId, description, doctor, user });
      }

      // 3. Book the consultation (demo or after payment)
      const bookRes = await api.post('/api/consultations/book', {
        slotId: selectedSlot.id,
        doctorId: doctorId,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_demo_' + Date.now()
      });

      setConfirmedConsultation(bookRes.data);
      setStep(3);
      addToast('Consultation confirmed! 🎉', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Booking failed. Please try again.', 'error');
    } finally {
      setBooking(false);
    }
  };

  // Razorpay popup (only works with real keys)
  const openRazorpay = ({ orderId, amount, keyId, description, doctor, user }) =>
    new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'SoulH Consultation',
        description,
        order_id: orderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#0d6b5e' },
        handler: resolve,
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    });

  const formatSlotTime = slot => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    return {
      date: start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  if (!doctor) return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: '#8aada5' }}>Doctor not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-0 right-0" style={{ background: 'rgba(13,107,94,0.1)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <button onClick={() => navigate('/doctors')} className="flex items-center gap-2 text-sm font-semibold mb-6"
          style={{ color: '#0d6b5e' }}>
          ← Back to Doctors
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-8">
          {['Select Slot', 'Payment', 'Confirmed'].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'text-white' : 'text-gray-400'}`}
                  style={{ background: step > i + 1 ? '#059669' : step === i + 1 ? '#0d6b5e' : '#e5e7eb' }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-bold hidden sm:block"
                  style={{ color: step >= i + 1 ? '#0d6b5e' : '#9ca3af' }}>{label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 mx-2" style={{ background: step > i + 1 ? '#0d6b5e' : '#e5e7eb' }} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Doctor Info */}
          <div className="glass p-5 flex flex-col items-center text-center h-fit">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white mb-3"
              style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
              {(doctor.name || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <h2 className="font-black text-lg" style={{ color: '#1a3530' }}>Dr. {doctor.name}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 mb-3"
              style={{ background: '#d1fae5', color: '#065f46' }}>✓ Verified</span>
            <div className="space-y-1.5 text-xs w-full text-left">
              {doctor.specialization && <p style={{ color: '#0d6b5e' }}>🔬 {doctor.specialization}</p>}
              {doctor.qualification && <p style={{ color: '#64748b' }}>🎓 {doctor.qualification}</p>}
              {doctor.hospital && <p style={{ color: '#64748b' }}>🏥 {doctor.hospital}</p>}
              {doctor.experience > 0 && <p style={{ color: '#64748b' }}>⭐ {doctor.experience} Years Exp.</p>}
            </div>
            <div className="mt-4 pt-3 w-full" style={{ borderTop: '1px solid rgba(13,107,94,0.1)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8aada5' }}>Consultation Fee</p>
              <p className="text-2xl font-black" style={{ color: '#0d6b5e' }}>₹{doctor.fee}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">

            {/* Step 1: Select Slot */}
            {step === 1 && (
              <div className="glass p-6">
                <h3 className="font-black text-lg mb-4" style={{ color: '#1a3530' }}>📅 Select a Time Slot</h3>
                {slots.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-4xl mb-3">📅</p>
                    <p className="font-semibold" style={{ color: '#1a3530' }}>No slots available</p>
                    <p className="text-sm mt-1" style={{ color: '#8aada5' }}>The doctor hasn't added any slots yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {slots.map(slot => {
                        const { date, time } = formatSlotTime(slot);
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition"
                            style={{
                              background: isSelected ? 'rgba(13,107,94,0.12)' : 'rgba(255,255,255,0.7)',
                              border: `2px solid ${isSelected ? '#0d6b5e' : 'rgba(13,107,94,0.1)'}`,
                            }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                              style={{ background: isSelected ? '#0d6b5e' : '#f3f4f6' }}>
                              {isSelected ? <span className="text-white text-sm font-black">✓</span> : '🕐'}
                            </div>
                            <div>
                              <p className="font-bold text-sm" style={{ color: '#1a3530' }}>{date}</p>
                              <p className="text-xs font-medium" style={{ color: '#0d6b5e' }}>{time}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => selectedSlot ? setStep(2) : addToast('Select a slot first', 'error')}
                      className="mt-5 w-full py-3 rounded-2xl font-bold text-sm transition shadow-md hover:shadow-lg"
                      style={{ background: '#0d6b5e', color: 'white' }}>
                      Continue to Payment →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && selectedSlot && (
              <div className="glass p-6">
                <h3 className="font-black text-lg mb-4" style={{ color: '#1a3530' }}>💳 Confirm & Pay</h3>

                {/* Summary */}
                <div className="p-4 rounded-2xl mb-5" style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.12)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#8aada5' }}>Booking Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#64748b' }}>Doctor</span>
                      <span className="font-bold" style={{ color: '#1a3530' }}>Dr. {doctor.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#64748b' }}>Date</span>
                      <span className="font-bold" style={{ color: '#1a3530' }}>{formatSlotTime(selectedSlot).date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#64748b' }}>Time</span>
                      <span className="font-bold" style={{ color: '#1a3530' }}>{formatSlotTime(selectedSlot).time}</span>
                    </div>
                    <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(13,107,94,0.15)' }}>
                      <span className="font-bold" style={{ color: '#1a3530' }}>Total</span>
                      <span className="font-black text-base" style={{ color: '#0d6b5e' }}>₹{doctor.fee}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl mb-5 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.4)', color: '#92400e' }}>
                  🔒 Payment is secured via Razorpay. Video consultation link will be sent after payment.
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl font-bold text-sm"
                    style={{ background: '#f3f4f6', color: '#374151' }}>
                    ← Back
                  </button>
                  <button onClick={handlePayAndBook} disabled={booking}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    style={{ background: '#0d6b5e', color: 'white' }}>
                    {booking ? <span className="animate-spin">⏳</span> : '💳'} {booking ? 'Processing...' : 'Pay & Confirm'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmed */}
            {step === 3 && confirmedConsultation && (
              <div className="glass p-8 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
                  style={{ background: '#d1fae5' }}>
                  ✅
                </div>
                <h3 className="font-black text-2xl mb-2" style={{ color: '#1a3530' }}>Consultation Confirmed!</h3>
                <p className="text-sm mb-6" style={{ color: '#8aada5' }}>
                  Your appointment with Dr. {doctor.name} is booked.
                </p>

                <div className="p-4 rounded-2xl mb-6 text-left space-y-3"
                  style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.15)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8aada5' }}>Consultation Details</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a3530' }}>
                    📅 {new Date(confirmedConsultation.scheduledAt).toLocaleString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(13,107,94,0.08)' }}>
                    <span className="text-lg">🎥</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: '#0d6b5e' }}>Video Consultation Room</p>
                      <p className="text-xs font-mono truncate" style={{ color: '#64748b' }}>
                        {confirmedConsultation.meetingUrl}
                      </p>
                    </div>
                    <a href={confirmedConsultation.meetingUrl} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      style={{ background: '#0d6b5e', color: 'white' }}>
                      Join
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/consultations')}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm transition shadow-sm"
                    style={{ background: '#0d6b5e', color: 'white' }}>
                    View My Consultations
                  </button>
                  <button onClick={() => navigate('/doctors')}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm transition"
                    style={{ background: '#f3f4f6', color: '#374151' }}>
                    Back to Doctors
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
