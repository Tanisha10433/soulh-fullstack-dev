import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

const STEPS = ['Basic Info', 'Upload Credentials', 'Review & Submit'];

export default function DoctorOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    council: '', regNumber: '', specialization: '',
    experience: '', hospital: '', qualification: '',
  });
  const [certFile, setCertFile] = useState(null);
  const [govIdFile, setGovIdFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const canNext = () => {
    if (step === 0) return form.council && form.regNumber && form.specialization;
    if (step === 1) return certFile && govIdFile;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('certificate', certFile);
      fd.append('govId', govIdFile);
      fd.append('council', form.council);
      fd.append('regNumber', form.regNumber);
      fd.append('specialization', form.specialization);
      fd.append('experience', form.experience);
      fd.append('hospital', form.hospital);
      fd.append('qualification', form.qualification);

      await api.post('/api/doctor/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      addToast('Application submitted! Our team will review within 2–3 business days.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="orb w-[600px] h-[600px] top-0 right-[-200px]" style={{ background: 'rgba(13,107,94,0.1)' }} />
      <div className="glass p-12 max-w-lg text-center relative z-10">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl"
          style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>👨‍⚕️</div>
        <h2 className="text-2xl font-black mb-3" style={{ color: '#1a3530' }}>Application Submitted!</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#4a7060' }}>
          Our medical review team will verify your credentials within <strong>2–3 business days</strong>.
          You'll receive a notification once your verified badge is approved.
        </p>
        <div className="p-4 rounded-2xl mb-6" style={{ background: 'rgba(13,107,94,0.07)', border: '1px solid rgba(13,107,94,0.15)' }}>
          <p className="text-xs font-semibold" style={{ color: '#0d6b5e' }}>
            🔒 Your uploaded documents are encrypted and only accessible to SoulH admins.
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3.5">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[600px] h-[600px] top-0 right-[-200px]" style={{ background: 'rgba(13,107,94,0.1)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-[-100px]" style={{ background: 'rgba(232,119,106,0.07)' }} />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="glass p-7">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>👨‍⚕️</div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1a3530' }}>Doctor Verification</h1>
              <p className="text-sm mt-0.5" style={{ color: '#8aada5' }}>Get your verified badge in 2–3 business days</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition"
                    style={{
                      background: i <= step ? 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' : 'rgba(13,107,94,0.1)',
                      color: i <= step ? 'white' : '#8aada5'
                    }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-semibold hidden sm:block"
                    style={{ color: i === step ? '#0d6b5e' : '#8aada5' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 rounded"
                    style={{ background: i < step ? '#0d6b5e' : 'rgba(13,107,94,0.15)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 0 — Basic Info */}
        {step === 0 && (
          <div className="glass p-7 space-y-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1a3530' }}>Professional Details</h2>
            {[
              { key: 'regNumber', label: 'Medical Registration Number *', placeholder: 'e.g. MCI-12345' },
              { key: 'council', label: 'Issuing Medical Council *', placeholder: 'e.g. Medical Council of India' },
              { key: 'specialization', label: 'Specialization *', placeholder: 'e.g. Rheumatology, Neurology...' },
              { key: 'qualification', label: 'Qualifications', placeholder: 'e.g. MBBS, MD, DM' },
              { key: 'hospital', label: 'Hospital / Clinic', placeholder: 'Where you currently practice' },
              { key: 'experience', label: 'Years of Experience', placeholder: 'e.g. 8', type: 'number' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="field-label">{label}</label>
                <input type={type || 'text'} value={form[key]} onChange={setField(key)}
                  placeholder={placeholder} className="input-field" />
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Upload Documents */}
        {step === 1 && (
          <div className="glass p-7 space-y-5">
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1a3530' }}>Upload Documents</h2>
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(13,107,94,0.06)', border: '1px solid rgba(13,107,94,0.12)' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#4a7060' }}>
                🔐 <strong>Your documents are encrypted</strong> and only visible to SoulH's medical review team.
                They are never shared publicly or used for marketing.
              </p>
            </div>

            {[
              { key: 'cert', label: 'Medical Registration Certificate *', hint: 'PDF, JPG, PNG · Max 5MB', setter: setCertFile, file: certFile },
              { key: 'govId', label: 'Government-Issued Photo ID *', hint: 'Passport, National ID, or Driver\'s License', setter: setGovIdFile, file: govIdFile },
            ].map(({ key, label, hint, setter, file }) => (
              <div key={key}>
                <label className="field-label">{label}</label>
                <div className="relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer hover:border-teal-400"
                  style={{ borderColor: file ? 'rgba(13,107,94,0.4)' : 'rgba(13,107,94,0.2)', background: file ? 'rgba(13,107,94,0.04)' : 'transparent' }}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => setter(e.target.files[0])} />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">✅</span>
                      <span className="text-sm font-semibold" style={{ color: '#0d6b5e' }}>{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl mb-2">📎</p>
                      <p className="text-sm font-semibold" style={{ color: '#4a7060' }}>Click or drag to upload</p>
                      <p className="text-xs mt-1" style={{ color: '#8aada5' }}>{hint}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — Review */}
        {step === 2 && (
          <div className="glass p-7 space-y-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1a3530' }}>Review Your Application</h2>
            {[
              ['Registration Number', form.regNumber],
              ['Council', form.council],
              ['Specialization', form.specialization],
              ['Qualifications', form.qualification || '—'],
              ['Hospital', form.hospital || '—'],
              ['Experience', form.experience ? `${form.experience} years` : '—'],
              ['Certificate', certFile?.name],
              ['Government ID', govIdFile?.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b" style={{ borderColor: 'rgba(13,107,94,0.08)' }}>
                <span className="text-xs font-semibold" style={{ color: '#8aada5' }}>{label}</span>
                <span className="text-xs font-bold" style={{ color: '#1a3530' }}>{value}</span>
              </div>
            ))}
            <div className="p-4 rounded-2xl mt-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                ⚠️ By submitting, you confirm that all information is accurate. Providing false credentials
                may result in permanent account termination and legal action.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 rounded-2xl font-semibold"
              style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex-1 btn-primary py-3.5"
              style={{ opacity: canNext() ? 1 : 0.5 }}>
              Continue →
            </button>
          ) : (
            <button id="submit-verification" onClick={submit} disabled={submitting} className="flex-1 btn-primary py-3.5">
              {submitting ? 'Submitting...' : '🚀 Submit for Verification'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
