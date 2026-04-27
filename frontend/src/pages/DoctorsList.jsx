import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function DoctorsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/api/doctors/verified')
      .then(r => setDoctors(r.data))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase()) ||
    d.hospital?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin text-4xl">⏳</div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] top-0 right-[-100px]" style={{ background: 'rgba(13,107,94,0.1)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-0" style={{ background: 'rgba(232,119,106,0.07)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
            style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e' }}>
            🩺 Verified Doctors
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#1a3530' }}>
            Book a Consultation
          </h1>
          <p className="text-base" style={{ color: '#8aada5' }}>
            Connect with verified medical professionals from the comfort of your home
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-8">
          <input
            type="text"
            placeholder="Search by name, specialization, or hospital..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 transition shadow-sm"
            style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(13,107,94,0.15)', color: '#1a3530' }}
          />
          <svg className="absolute left-4 top-3.5 w-4 h-4" fill="none" stroke="#8aada5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Doctors Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🩺</p>
            <p className="font-bold text-lg" style={{ color: '#1a3530' }}>
              {doctors.length === 0 ? 'No verified doctors yet.' : 'No doctors match your search.'}
            </p>
            <p className="text-sm mt-2" style={{ color: '#8aada5' }}>
              Doctors are verified by our admin team before listing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} onBook={() => navigate(`/doctors/${doctor.id}/book`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor, onBook }) {
  const initials = (doctor.name || 'D').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="glass overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-200"
      style={{ borderRadius: '20px' }}>
      {/* Card top gradient */}
      <div className="h-16 relative flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0d6b5e, #1aab98)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      </div>

      <div className="px-5 pb-5 flex flex-col flex-1 -mt-7">
        <div className="flex items-end gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg border-3 border-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)', border: '3px solid white' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-base truncate" style={{ color: '#1a3530' }}>Dr. {doctor.name}</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#d1fae5', color: '#065f46' }}>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          {doctor.specialization && (
            <p className="text-sm font-semibold" style={{ color: '#0d6b5e' }}>🔬 {doctor.specialization}</p>
          )}
          {doctor.qualification && (
            <p className="text-xs font-medium" style={{ color: '#64748b' }}>🎓 {doctor.qualification}</p>
          )}
          {doctor.hospital && (
            <p className="text-xs font-medium truncate" style={{ color: '#64748b' }}>🏥 {doctor.hospital}</p>
          )}
          {doctor.experience > 0 && (
            <p className="text-xs font-medium" style={{ color: '#64748b' }}>⭐ {doctor.experience} Years Experience</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: '1px solid rgba(13,107,94,0.1)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8aada5' }}>Consultation Fee</p>
            <p className="text-lg font-black" style={{ color: '#0d6b5e' }}>₹{doctor.fee}</p>
          </div>
          <button onClick={onBook}
            className="px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm hover:shadow-md active:scale-95"
            style={{ background: '#0d6b5e', color: 'white' }}>
            Book Now →
          </button>
        </div>
      </div>
    </div>
  );
}
