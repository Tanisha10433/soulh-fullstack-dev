import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import WhyChooseDoctors from '../components/WhyChooseDoctors';
import api from '../api';

export default function DoctorsList() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/api/users/doctors')
      .then(r => setDoctors(r.data))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase()) ||
    d.hospital?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Finding support experts...</p>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f8fafc] py-16">
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-50/50 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/40 blur-[100px] rounded-full -z-10" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-teal-100 shadow-sm"
            style={{ background: 'rgba(255,255,255,0.8)', color: '#0f766e' }}>
            🌿 Verified Professionals
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-800">
            Find Your Support Guide
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Connect with verified medical professionals specialized in mental health and chronic care who understand your journey.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto mb-16">
          <input
            type="text"
            placeholder="Search by name, condition, or specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-7 py-5 pl-14 rounded-full text-base bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition shadow-lg shadow-slate-200/50"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-40">🔍</span>
        </div>

        {/* Why Choose Our Doctors Section */}
        <WhyChooseDoctors />

        {/* Doctors List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-[3rem] border-white/50">
            <p className="text-6xl mb-6">🌿</p>
            <p className="font-black text-2xl text-slate-800 tracking-tight">
              {doctors.length === 0 ? 'No verified guides yet.' : 'No guides match your search.'}
            </p>
            <p className="text-base mt-3 text-slate-500 font-medium max-w-md mx-auto">
              Our team carefully verifies every professional before they join our support network.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor }) {
  const initials = (doctor.name || 'D').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayName = doctor.name?.toLowerCase().startsWith('dr.') ? doctor.name : `Dr. ${doctor.name}`;
  
  return (
    <Link to={`/doctors/${doctor.id}`} 
      className="glass p-6 md:p-8 rounded-[2.5rem] border-white/60 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden bg-white/40">
      
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-600/5 blur-2xl -mr-10 -mt-10 rounded-full transition-transform duration-500 group-hover:scale-150" />

      <div className="flex flex-col sm:flex-row gap-6 relative z-10">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl border-4 border-white shrink-0 bg-gradient-to-br from-teal-500 to-teal-700">
          {initials}
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-black text-xl text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
              {displayName}
            </h3>
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[9px] font-black uppercase tracking-widest border border-teal-100 shadow-sm mb-3">
            SoulH Verified Guide
          </span>
          
          <div className="space-y-2">
            <p className="text-sm font-bold text-teal-600 flex items-center gap-2">
              <span className="text-lg">🤝</span> {doctor.illnessCondition || doctor.specialization || 'Support Expert'}
            </p>
            {doctor.experience > 0 && (
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <span className="text-lg">✨</span> {doctor.experience} Years of Guidance
              </p>
            )}
            {doctor.hospital && (
              <p className="text-xs font-medium text-slate-500 flex items-center gap-2 truncate">
                <span className="text-lg">🏥</span> {doctor.hospital}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100/80 flex items-center justify-between relative z-10">
        <div>
          {/* <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Access</p>
          <p className="text-lg font-black text-teal-700">₹{doctor.fee || 499}</p> */}
        </div>
        <div className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 group-hover:bg-teal-600 group-hover:shadow-teal-600/20 transition-all">
          View Profile ➔
        </div>
      </div>
    </Link>
  );
}
