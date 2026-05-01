import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '', specialization: '', experience: '', qualification: '', hospital: '',
    bio: '', expertiseAreas: [], awards: [], publications: []
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/doctor/profile');
      
      // Auto-fill demo data if empty
      let bio = res.data.bio;
      let expAreas = res.data.expertiseAreas || [];
      let awds = res.data.awards || [];
      let pubs = res.data.publications || [];
      
      if (!bio && res.data.email === 'doctor@soulh.com') {
          bio = "I am a chronic illness specialist focusing on endometriosis, pelvic pain, and women's health. I have helped hundreds of patients manage long-term conditions with personalized care and empathy.";
          expAreas = ["Endometriosis management", "Chronic pelvic pain", "PCOS", "Hormonal disorders"];
          awds = ["Best Gynecologist Award – 2021", "Excellence in Women’s Health – 2020"];
          pubs = ["“Advances in Endometriosis Treatment” – 2022", "“Chronic Pelvic Pain Management” – 2021"];
      }

      setProfile({...res.data, bio, expertiseAreas: expAreas, awards: awds, publications: pubs});
      setForm({
        name: res.data.name || '',
        specialization: res.data.specialization || '',
        experience: String(res.data.experience || ''),
        qualification: res.data.qualification || '',
        hospital: res.data.hospital || '',
        bio: bio || '',
        expertiseAreas: expAreas,
        awards: awds,
        publications: pubs
      });
    } catch {
      addToast('Failed to load profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user || user.role !== 'DOCTOR') { navigate('/login'); return; }
    loadProfile();
  }, [user, navigate, loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/doctor/profile', form);
      addToast('Public profile updated! ✅', 'success');
      setEditing(false);
      loadProfile();
    } catch {
      addToast('Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleListChange = (key, value, index) => {
    const newList = [...form[key]];
    newList[index] = value;
    setForm({ ...form, [key]: newList });
  };

  const addListItem = (key) => {
    setForm({ ...form, [key]: [...form[key], ''] });
  };

  const removeListItem = (key, index) => {
    setForm({ ...form, [key]: form[key].filter((_, i) => i !== index) });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Loading your profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 pt-10 relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-50/50 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/40 blur-[100px] rounded-full -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        <Link to="/doctor" className="inline-flex items-center gap-2 mb-8 font-black text-[11px] uppercase tracking-widest text-teal-700 hover:gap-3 transition-all">
          <span>←</span> Back to Dashboard
        </Link>

        {/* Profile Header Card */}
        <div className="glass rounded-[3rem] overflow-hidden shadow-2xl border-white/40 mb-8 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/5 blur-3xl -mr-32 -mt-32 rounded-full" />
          
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white bg-gradient-to-br from-teal-500 to-teal-700 shrink-0">
                  {profile.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-center md:text-left mt-2">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                        {profile.name?.toLowerCase().startsWith('dr.') ? profile.name : `Dr. ${profile.name}`}
                    </h1>
                    {profile.isVerified && <span className="text-[10px] bg-teal-50 text-teal-600 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-teal-100 shadow-sm">Verified Guide</span>}
                  </div>
                  <p className="text-teal-600 font-bold text-lg mt-2">{profile.specialization || 'Support Expert'}</p>
                </div>
              </div>
              <button onClick={() => setEditing(!editing)} 
                className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${editing ? 'bg-slate-100 text-slate-500' : 'bg-teal-600 text-white shadow-teal-600/20 hover:scale-105'}`}>
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {!editing ? (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Support Philosophy</h3>
                    <p className="text-slate-600 leading-relaxed font-medium text-lg italic">
                      "{profile.bio || "Click 'Edit Profile' to add your support philosophy and let members know how you can help them."}"
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Areas I Support</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.expertiseAreas?.length > 0 ? profile.expertiseAreas.map(area => (
                        <span key={area} className="px-5 py-2.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100 shadow-sm">{area}</span>
                      )) : <p className="text-xs text-slate-400 font-medium italic">Add your specific areas of expertise.</p>}
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <InfoItem icon="🎓" label="Qualification" value={profile.qualification || 'Medical Professional'} />
                  <InfoItem icon="🤝" label="Experience" value={profile.experience ? `${profile.experience}+ Years of Support` : 'Experienced Guide'} />
                  <InfoItem icon="🏥" label="Affiliation" value={profile.hospital || 'SoulH Network'} />
                </div>
              </div>
            ) : (
              <div className="mt-12 space-y-8 bg-white/40 p-8 rounded-[2rem] border border-white/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Full Name" value={form.name} onChange={v => setForm({...form, name: v})} />
                  <Input label="Specialization" value={form.specialization} onChange={v => setForm({...form, specialization: v})} />
                  <Input label="Experience (Years)" value={form.experience} onChange={v => setForm({...form, experience: v})} type="number" />
                  <Input label="Qualification" value={form.qualification} onChange={v => setForm({...form, qualification: v})} />
                  <Input label="Hospital / Affiliation" value={form.hospital} onChange={v => setForm({...form, hospital: v})} className="md:col-span-2" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-800 mb-2 block ml-1">Support Philosophy (Bio)</label>
                  <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} 
                    className="w-full p-6 rounded-3xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition min-h-[150px]"
                    placeholder="Share how you support patients, your approach to care..."
                  />
                </div>

                <ListInput label="Areas of Support (Expertise)" list={form.expertiseAreas} 
                  onChange={(v, i) => handleListChange('expertiseAreas', v, i)} 
                  onAdd={() => addListItem('expertiseAreas')} 
                  onRemove={i => removeListItem('expertiseAreas', i)} 
                />

                <div className="pt-6">
                  <button onClick={handleSave} disabled={saving} className="w-full py-5 rounded-[2rem] bg-teal-600 text-white font-black uppercase tracking-widest shadow-xl shadow-teal-600/20 active:scale-[0.98] hover:scale-[1.01] transition-all">
                    {saving ? 'Saving Changes...' : 'Save Public Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Awards & Publications */}
        {!editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="glass p-10 rounded-[3rem] border-white/40">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">🏆 Recognition & Awards</h3>
              <div className="space-y-5">
                {profile.awards?.length > 0 ? profile.awards.map((award, i) => (
                  <div key={i} className="flex gap-4 items-center bg-white/40 p-4 rounded-2xl border border-teal-50/50">
                    <span className="text-2xl">🎖️</span>
                    <p className="text-sm font-bold text-slate-700">{award}</p>
                  </div>
                )) : <p className="text-sm text-slate-400 italic font-medium">Professional honors will appear here.</p>}
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] border-white/40">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">📚 Shared Resources</h3>
              <div className="space-y-4">
                {profile.publications?.length > 0 ? profile.publications.map((pub, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-teal-600 mt-0.5">📖</span>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{pub}</p>
                  </div>
                )) : <p className="text-sm text-slate-400 italic font-medium">Published resources will appear here.</p>}
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
             <ListInput label="Awards & Recognition" list={form.awards} 
                  onChange={(v, i) => handleListChange('awards', v, i)} 
                  onAdd={() => addListItem('awards')} 
                  onRemove={i => removeListItem('awards', i)} 
                />
             <ListInput label="Publications & Resources" list={form.publications} 
                  onChange={(v, i) => handleListChange('publications', v, i)} 
                  onAdd={() => addListItem('publications')} 
                  onRemove={i => removeListItem('publications', i)} 
                />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="p-5 rounded-2xl bg-white/40 border border-slate-100 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm text-teal-600">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label className="text-[10px] font-black uppercase tracking-widest text-teal-800 mb-2 block ml-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} 
        className="w-full px-5 py-4 rounded-2xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition shadow-sm"
      />
    </div>
  );
}

function ListInput({ label, list, onChange, onAdd, onRemove }) {
  return (
    <div className="glass p-8 rounded-[2.5rem] border-white/50">
      <div className="flex items-center justify-between mb-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-teal-800">{label}</label>
        <button onClick={onAdd} className="text-[10px] font-black text-white bg-teal-600 px-4 py-2 rounded-full shadow-md hover:scale-105 transition">+ Add Item</button>
      </div>
      <div className="space-y-3">
        {list.map((item, i) => (
          <div key={i} className="flex gap-3 group">
            <input value={item} onChange={e => onChange(e.target.value, i)} 
              className="flex-1 px-5 py-3 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm transition"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
            <button onClick={() => onRemove(i)} className="w-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition border border-slate-100 flex items-center justify-center shadow-sm">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
