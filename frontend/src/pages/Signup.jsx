import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const COMMON_CONDITIONS = [
  'Diabetes', 'Anxiety', 'Depression', 'PCOS', 'Lupus',
  'Fibromyalgia', 'Arthritis', 'Crohn\'s Disease', 'Multiple Sclerosis', 'Thyroid Disorder',
  'Chronic Pain', 'Heart Disease', 'Chronic Fatigue', 'Migraine', 'Other',
];

export default function Signup() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [selectedCondition, setSelectedCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  // Doctor specific fields:
  const [docFields, setDocFields] = useState({ registrationNumber: '', experience: '', qualification: '', hospital: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1); // 2-step signup

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { addToast('Please fill all fields.', 'error'); return; }
    if (form.password.length < 8)  { addToast('Password must be at least 8 characters.', 'error'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.role === 'DOCTOR') {
      if (!docFields.registrationNumber || !docFields.experience || !docFields.qualification || !docFields.hospital || !selectedCondition) {
        addToast('Please fill all medical specialty fields.', 'error');
        return;
      }
    }
    const condition = selectedCondition === 'Other' ? customCondition : selectedCondition;
    setLoading(true);
    try {
      const payload = {
         ...form,
         illnessCondition: condition,
         ...(form.role === 'DOCTOR' ? {
           registrationNumber: docFields.registrationNumber,
           experience: parseInt(docFields.experience, 10),
           qualification: docFields.qualification,
           hospital: docFields.hospital
         } : {})
      };
      const data = await register(payload);
      addToast(`Welcome to SoulH, ${data.name.split(' ')[0]}! 💙`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not create account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (e) => {
    if (e) e.preventDefault();
    const condition = form.role === 'DOCTOR' ? 'General Support' : '';
    setLoading(true);
    try {
      const payload = {
         ...form,
         illnessCondition: condition,
         ...(form.role === 'DOCTOR' ? {
           registrationNumber: docFields.registrationNumber || 'PENDING',
           experience: docFields.experience ? parseInt(docFields.experience, 10) : 1,
           qualification: docFields.qualification || 'Not Specified',
           hospital: docFields.hospital || 'Not Specified'
         } : {})
      };
      const data = await register(payload);
      addToast(`Welcome to SoulH, ${data.name.split(' ')[0]}! 💙`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not create account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pwLen = form.password.length;
  const strengthPct = Math.min(100, (pwLen / 12) * 100);
  const strengthColor = pwLen >= 10 ? '#059669' : pwLen >= 7 ? '#d97706' : pwLen >= 4 ? '#f59e0b' : '#e5e7eb';
  const strengthLabel = pwLen === 0 ? '' : pwLen < 6 ? 'Too short' : pwLen < 10 ? 'Getting stronger...' : '✓ Strong password';

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="orb w-[600px] h-[600px] top-[-200px] right-[-200px]" style={{ background: 'rgba(13,107,94,0.1)', animationDelay: '1s' }} />
      <div className="orb w-[400px] h-[400px] bottom-[-100px] left-[-100px]" style={{ background: 'rgba(232,119,106,0.1)', animationDelay: '3s' }} />

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6 py-16">
        <div className="w-full max-w-md page-enter">

          <Link to="/" className="flex items-center gap-2 justify-center mb-8">
            <span className="text-2xl">🫀</span>
            <span className="text-xl font-black gradient-text-teal">SoulH</span>
          </Link>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(n => (
              <React.Fragment key={n}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300"
                    style={{
                      background: step >= n ? 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' : 'rgba(13,107,94,0.1)',
                      color: step >= n ? 'white' : '#8aada5',
                    }}>
                    {step > n ? '✓' : n}
                  </div>
                  <span className="text-xs font-semibold hidden sm:block" style={{ color: step >= n ? '#0d6b5e' : '#8aada5' }}>
                    {n === 1 ? 'Account' : 'Condition'}
                  </span>
                </div>
                {n < 2 && <div className="flex-1 h-1 rounded-full" style={{ background: step > n ? '#0d6b5e' : 'rgba(13,107,94,0.15)' }} />}
              </React.Fragment>
            ))}
          </div>

          <div className="glass p-8 md:p-10">

            {/* STEP 1 — Account Details */}
            {step === 1 && (
              <>
                <div className="mb-7">
                  <p className="font-semibold text-sm mb-1 tracking-wide" style={{ color: '#0d6b5e' }}>STEP 1 OF 2</p>
                  <h2 className="text-3xl font-black" style={{ color: '#1a3530' }}>Create Account</h2>
                  <p className="mt-1 text-sm" style={{ color: '#8aada5' }}>Free forever — no credit card needed</p>
                </div>

                <form onSubmit={handleNext} className="space-y-5">
                  <div>
                    <label className="field-label">Full Name</label>
                    <input id="signup-name" type="text" required value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name" className="input-field" />
                  </div>
                  <div>
                    <label className="field-label">Email Address</label>
                    <input id="signup-email" type="email" required value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com" className="input-field" />
                  </div>
                  <div>
                    <label className="field-label">Password</label>
                    <div className="relative">
                      <input id="signup-password"
                        type={showPass ? 'text' : 'password'} required minLength={8}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="Min. 8 characters" className="input-field" style={{ paddingRight: '48px' }} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm">
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {pwLen > 0 && (
                      <>
                        <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(13,107,94,0.1)' }}>
                          <div className="h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${strengthPct}%`, background: strengthColor }} />
                        </div>
                        <p className="text-xs mt-1" style={{ color: strengthColor }}>{strengthLabel}</p>
                      </>
                    )}
                  </div>

                  {/* Role Toggle */}
                  <div>
                    <label className="field-label">I am joining as</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'USER',   label: '🙋 Member',  desc: 'Seeking peer support' },
                        { value: 'DOCTOR', label: '👨‍⚕️ Doctor', desc: 'Healthcare professional' },
                      ].map(r => (
                        <button key={r.value} type="button" id={`role-${r.value.toLowerCase()}`}
                          onClick={() => setForm({ ...form, role: r.value })}
                          className="p-4 rounded-2xl text-left transition-all duration-200"
                          style={{
                            background: form.role === r.value ? 'rgba(13,107,94,0.1)' : 'rgba(13,107,94,0.03)',
                            border: `1.5px solid ${form.role === r.value ? 'rgba(13,107,94,0.4)' : 'rgba(13,107,94,0.15)'}`,
                          }}>
                          <p className="font-bold text-sm" style={{ color: '#1a3530' }}>{r.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#8aada5' }}>{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full py-4 text-base mt-2">
                    Next: Choose Your Condition →
                  </button>
                </form>

                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px" style={{ background: 'rgba(13,107,94,0.12)' }} />
                  <span className="text-xs font-medium" style={{ color: '#8aada5' }}>ALREADY A MEMBER?</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(13,107,94,0.12)' }} />
                </div>
                <Link to="/login" className="btn-ghost w-full py-3.5 text-sm">Sign in instead</Link>
              </>
            )}

            {/* STEP 2 — Condition Selector or Doctor Info */}
            {step === 2 && (
              <>
                <div className="mb-7">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm font-semibold mb-3 hover:underline" style={{ color: '#0d6b5e' }}>
                    ← Back
                  </button>
                  <p className="font-semibold text-sm mb-1 tracking-wide" style={{ color: '#0d6b5e' }}>STEP 2 OF 2</p>
                  <h2 className="text-2xl font-black" style={{ color: '#1a3530' }}>
                    {form.role === 'DOCTOR' ? "What's your Medical Specialty?" : "What's your condition?"}
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: '#8aada5' }}>
                    {form.role === 'DOCTOR' ? "We'll show this to users seeking medical professionals." : "We'll match you with peers who share your experience. You can update this later."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {form.role === 'DOCTOR' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="field-label">Medical Registration / License Number <span style={{ color: '#dc2626' }}>*</span></label>
                        <input type="text" required value={docFields.registrationNumber}
                          onChange={e => setDocFields({...docFields, registrationNumber: e.target.value})}
                          placeholder="e.g. MCI-123456" className="input-field" />
                      </div>
                      <div>
                        <label className="field-label">Experience (Years) <span style={{ color: '#dc2626' }}>*</span></label>
                        <input type="number" required min="1" max="70" value={docFields.experience}
                          onChange={e => setDocFields({...docFields, experience: e.target.value})}
                          placeholder="e.g. 5" className="input-field" />
                      </div>
                      <div>
                        <label className="field-label">Qualification <span style={{ color: '#dc2626' }}>*</span></label>
                        <input type="text" required value={docFields.qualification}
                          onChange={e => setDocFields({...docFields, qualification: e.target.value})}
                          placeholder="e.g. MBBS, MD" className="input-field" />
                      </div>
                      <div className="col-span-2">
                        <label className="field-label">Hospital/Clinic Name <span style={{ color: '#dc2626' }}>*</span></label>
                        <input type="text" required value={docFields.hospital}
                          onChange={e => setDocFields({...docFields, hospital: e.target.value})}
                          placeholder="Where do you practice?" className="input-field" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="field-label">
                      {form.role === 'DOCTOR' ? "Select Your Main Specialty" : "Select Your Main Condition"}
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1">
                      {COMMON_CONDITIONS.map(c => (
                        <button
                          key={c} type="button"
                          onClick={() => setSelectedCondition(c)}
                          className="condition-chip text-sm"
                          style={{
                            background: selectedCondition === c ? 'rgba(13,107,94,0.12)' : 'white',
                            borderColor: selectedCondition === c ? 'rgba(13,107,94,0.5)' : 'rgba(13,107,94,0.15)',
                            color: selectedCondition === c ? '#0d6b5e' : '#1a3530',
                            fontWeight: selectedCondition === c ? 700 : 500,
                            padding: '8px 14px',
                          }}
                        >
                          {selectedCondition === c && '✓ '}{c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCondition === 'Other' && (
                    <div>
                      <label className="field-label">
                        {form.role === 'DOCTOR' ? "Enter Alternative Specialty" : "Describe Your Condition"}
                      </label>
                      <input
                        type="text" value={customCondition}
                        onChange={e => setCustomCondition(e.target.value)}
                        placeholder="Use your own words..."
                        className="input-field"
                      />
                    </div>
                  )}

                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(13,107,94,0.06)', color: '#4a7060' }}>
                    💡 You can skip this and set it later from your profile.
                  </div>

                  <button id="signup-btn" type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
                    {loading
                      ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />Creating account...</>
                      : '🌱 Join SoulH Free →'
                    }
                  </button>
                  <button type="button" onClick={handleSkip} className="btn-ghost w-full py-3 text-sm" disabled={loading}>
                    {form.role === 'DOCTOR' ? 'Skip specialty & finalize signup' : 'Skip & join without condition'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right panel (desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] relative z-10 p-12"
        style={{ background: 'rgba(13,107,94,0.04)', borderLeft: '1px solid rgba(13,107,94,0.1)' }}>
        <div />
        <div>
          <p className="text-5xl font-black leading-tight mb-6" style={{ color: '#1a3530' }}>
            Your story<br />matters.<br /><span className="gradient-text">Share it.</span>
          </p>
          <p className="text-lg leading-relaxed max-w-sm mb-10" style={{ color: '#4a7060' }}>
            You're not just signing up. You're joining thousands of people who decided to stop suffering in silence.
          </p>
          <div className="space-y-4">
            {[
              { icon: '🎤', text: 'Voice chat — no need to type when exhausted' },
              { icon: '🔍', text: 'Search by illness — find people who truly get it' },
              { icon: '🔒', text: 'Full privacy control over your profile' },
              { icon: '🏥', text: 'Doctor verified badges for extra credibility' },
              { icon: '💯', text: 'Completely free, forever' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(13,107,94,0.1)' }}>
                  <span className="text-base">{f.icon}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#4a7060' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm" style={{ color: '#8aada5' }}>© 2025 SoulH. Peer support, not medical advice.</p>
      </div>
    </div>
  );
}
