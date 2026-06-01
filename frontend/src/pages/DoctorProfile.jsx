import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const { isDarkMode } = useTheme();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canChat, setCanChat] = useState(false);

  useEffect(() => {
    api.get(`/api/users/${doctorId}`)
      .then(res => setDoctor(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    api.get(`/api/connections/status/${doctorId}`)
      .then(res => setCanChat(res.data.connected))
      .catch(() => setCanChat(false));
  }, [doctorId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0faf8]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 font-bold text-teal-800">Connecting with Expert...</p>
    </div>
  );

  if (!doctor) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">🌿</p>
        <p className="text-xl font-bold" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>Expert profile not found.</p>
        <Link to="/doctors" className="mt-4 inline-block text-teal-600 font-bold hover:underline">Return to Directory</Link>
      </div>
    </div>
  );

  const displayName = doctor.name?.toLowerCase().startsWith('dr.') ? doctor.name : `Dr. ${doctor.name}`;

  return (
    <div className="min-h-screen relative bg-[#f8fafc] pb-24 overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-100/40 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 blur-[100px] rounded-full -z-10" />

      <div className="max-w-5xl mx-auto px-6 pt-24 relative z-10">
        
        <Link to="/doctors" className="inline-flex items-center gap-2 mb-10 font-black text-[11px] uppercase tracking-widest text-teal-700 hover:gap-3 transition-all">
          <span>←</span> Back to Support Experts
        </Link>

        <div className="flex flex-col gap-8">
          
          <div className="glass rounded-[3rem] p-8 md:p-12 shadow-2xl border-white/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/5 blur-3xl -mr-32 -mt-32 rounded-full" />
            
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center text-5xl md:text-7xl font-black text-white shadow-2xl shrink-0 border-8 border-white bg-gradient-to-br from-teal-500 to-teal-700">
                {doctor.name?.[0]?.toUpperCase()}
              </div>

              <div className="flex-1 text-center md:text-left space-y-6">
                <div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-800">
                      {displayName}
                    </h1>
                    {doctor.isVerified && (
                      <span className="px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest border border-teal-100">Verified Guide</span>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-teal-600">
                    {doctor.illnessCondition || 'Chronic Illness Specialist'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 border border-teal-50">
                    <span className="text-2xl">🤝</span>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expert Guidance</p>
                      <p className="text-sm font-bold text-slate-700">{doctor.experience || 10}+ Years of Support</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 border border-teal-50">
                    <span className="text-2xl">✨</span>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Validation Focus</p>
                      <p className="text-sm font-bold text-slate-700">Holistic Care Approach</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                  <Link to={`/doctors/${doctor.id}/book`} className="px-10 py-4 rounded-2xl bg-teal-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-600/20 hover:scale-105 transition active:scale-95">
                    Request Guidance
                  </Link>
                  {canChat && (
                    <Link 
                      to={`/chat/${doctor.id}`} 
                      onClick={() => sessionStorage.setItem(`peer_${doctor.id}`, JSON.stringify(doctor))}
                      className="px-10 py-4 rounded-2xl bg-white text-teal-700 border-2 border-teal-700 font-black uppercase tracking-widest text-xs hover:bg-teal-50 transition active:scale-95">
                      Send Message
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-8 space-y-8">
              <section className="glass p-10 rounded-[3rem] border-white/40">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Support Philosophy</h3>
                <p className="text-lg font-medium leading-relaxed text-slate-600 italic">
                  "{doctor.bio || `As a specialist in ${doctor.illnessCondition || 'chronic care'}, I am committed to providing expert validation and guidance for members navigating their health journey. Empathy and understanding are at the core of my practice.`}"
                </p>
                
                <div className="mt-10">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Areas I Support</h4>
                  <div className="flex flex-wrap gap-2">
                    {doctor.expertiseAreas?.length > 0 ? doctor.expertiseAreas.map(area => (
                      <span key={area} className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100 shadow-sm">{area}</span>
                    )) : (
                      <>
                        <span className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">Patient Validation</span>
                        <span className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">Second Opinions</span>
                        <span className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">Condition Management</span>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section className="glass p-10 rounded-[3rem] border-white/40">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">🏆 Recognition & Awards</h3>
                <div className="space-y-4">
                  {doctor.awards?.length > 0 ? doctor.awards.map((award, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 border border-teal-50/50 shadow-sm">
                      <span className="text-2xl">🎖️</span>
                      <p className="text-sm font-bold text-slate-700">{award}</p>
                    </div>
                  )) : (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 border border-teal-50/50 shadow-sm">
                      <span className="text-2xl">🏅</span>
                      <p className="text-sm font-bold text-slate-700">SoulH Excellence in Empathetic Care</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400 mb-6">Expertise Context</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-300 mb-1">Qualification</p>
                    <p className="text-base font-bold">{doctor.qualification || 'Medical Professional'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-300 mb-1">Verification Status</p>
                    <p className="text-base font-bold">SoulH Verified Guide</p>
                  </div>
                </div>
              </div>

              <div className="glass p-8 rounded-[3rem] border-white/40">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">📚 Guidance Resources</h3>
                <div className="space-y-4">
                  {doctor.publications?.length > 0 ? doctor.publications.map((pub, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/30 p-3 rounded-2xl border border-teal-50/50">
                      <span className="text-teal-600 mt-1">📖</span>
                      <p className="text-xs font-bold text-slate-700 leading-normal">{pub}</p>
                    </div>
                  )) : (
                    <div className="flex items-start gap-3 bg-white/30 p-3 rounded-2xl border border-teal-50/50">
                      <span className="text-teal-600 mt-1">📝</span>
                      <p className="text-xs font-bold text-slate-700 leading-normal">Guide to Navigating Chronic Conditions and Mental Wellness</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
