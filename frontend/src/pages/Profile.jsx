import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

// Consistent gradient per user name initial
const getAvatarGradient = (name = '') => {
  const gradients = [
    'linear-gradient(135deg,#0d6b5e,#0f8b7a)',
    'linear-gradient(135deg,#e8776a,#d45f52)',
    'linear-gradient(135deg,#7c3aed,#6d28d9)',
    'linear-gradient(135deg,#0284c7,#0369a1)',
    'linear-gradient(135deg,#059669,#047857)',
    'linear-gradient(135deg,#d97706,#b45309)',
    'linear-gradient(135deg,#db2777,#be185d)',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', illnessCondition: '', bio: '', isPublicProfile: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connections, setConnections] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/connections'),
    ]).then(([profileRes, connRes]) => {
      const p = profileRes.data;
      setProfile(p);
      setForm({ name: p.name, illnessCondition: p.illnessCondition || '', bio: p.bio || '', isPublicProfile: p.publicProfile });
      setConnections(connRes.data);
    });
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      const { data } = await api.patch('/api/users/me', {
        illnessCondition: form.illnessCondition,
        publicProfile: form.isPublicProfile,
        bio: form.bio,
      });
      setProfile(data);
      setSaved(true);
      addToast('Profile saved successfully!', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      addToast('Could not save profile. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/signup');
    setCopied(true);
    addToast('Referral link copied! Share SoulH with a friend 💙', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  if (!profile) return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-6">
        {[180, 280, 200].map((w, i) => (
          <div key={i} className="glass p-7 animate-pulse space-y-4">
            <div className="h-5 rounded-xl" style={{ background: 'rgba(13,107,94,0.1)', width: `${w}px` }} />
            <div className="h-12 rounded-xl" style={{ background: 'rgba(13,107,94,0.07)' }} />
            <div className="h-12 rounded-xl" style={{ background: 'rgba(13,107,94,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  );

  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[600px] h-[600px] top-[-100px] right-[-200px]" style={{ background: 'rgba(13,107,94,0.1)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-0" style={{ background: 'rgba(232,119,106,0.08)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Profile Header */}
        <div className="glass p-8">
          <div className="flex items-start gap-6">
            {/* Gradient Avatar */}
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white flex-shrink-0"
              style={{ background: getAvatarGradient(profile.name) }}>
              {profile.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-black" style={{ color: '#1a3530' }}>{profile.name}</h1>
                {profile.verified && (
                  <span className="badge badge-teal relative group cursor-default">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded w-40 text-center shadow-lg pointer-events-none z-50" style={{ lineHeight: '1.2' }}>
                      Officially verified medical credentials by SoulH Admins
                    </span>
                    ✓ Verified Doctor
                  </span>
                )}
              </div>
              <p className="text-sm mb-2" style={{ color: '#8aada5' }}>{profile.email}</p>
              {/* Bio display */}
              {profile.bio && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#4a7060' }}>
                  {profile.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className={`badge ${profile.publicProfile ? 'badge-green' : 'badge-indigo'}`}>
                  {profile.publicProfile ? '🌍 Public' : '🔒 Private'}
                </span>
                <span className="badge badge-indigo">
                  {profile.role === 'DOCTOR' ? '👨‍⚕️ Doctor' : '🙋 Member'}
                </span>
                {profile.illnessCondition && (
                  <span className="badge badge-teal">🏥 {profile.illnessCondition}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6" style={{ borderTop: '1px solid rgba(13,107,94,0.1)' }}>
            {[
              { label: 'Connections', value: connections.length, icon: '👥' },
              { label: 'Member Since', value: joinedDate, icon: '📅' },
              { label: 'Profile', value: profile.publicProfile ? 'Public' : 'Private', icon: '🔒' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center">
                <p className="text-xl mb-1">{icon}</p>
                <p className="text-xl font-black" style={{ color: '#0d6b5e' }}>{value}</p>
                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: '#8aada5' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <div className="glass p-7 space-y-5">
          <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: '#1a3530' }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,107,94,0.1)' }}>✏️</span>
            Edit Profile
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Name (read only) */}
            <div>
              <label className="field-label">Full Name</label>
              <input type="text" value={form.name} disabled className="input-field"
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <p className="text-xs mt-1" style={{ color: '#8aada5' }}>Name cannot be changed after signup.</p>
            </div>

            {/* Bio */}
            <div>
              <label className="field-label">About Me / Bio</label>
              <textarea
                id="profile-bio"
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Share a little about yourself, your journey with chronic illness, or what you're looking for in a peer connection..."
                rows={3}
                className="input-field resize-none"
                maxLength={300}
                style={{ lineHeight: '1.6' }}
              />
              <p className="text-xs mt-1 text-right" style={{ color: form.bio.length > 250 ? '#e8776a' : '#8aada5' }}>
                {form.bio.length}/300
              </p>
            </div>

            {/* Condition */}
            <div>
              <label className="field-label">
                {profile.role === 'DOCTOR' ? 'Medical Specialty' : 'Health Condition / Illness'}
              </label>
              <input
                id="profile-condition"
                type="text"
                value={form.illnessCondition}
                onChange={e => setForm({ ...form, illnessCondition: e.target.value })}
                placeholder={profile.role === 'DOCTOR' ? 'e.g. Psychiatry, Endocrinology...' : 'e.g. Anxiety, Diabetes, PCOS, Lupus...'}
                className="input-field"
              />
              <p className="text-xs mt-1" style={{ color: '#8aada5' }}>Used to match you with similar peers in search.</p>
            </div>

            {/* Privacy */}
            <div className="flex items-center justify-between p-4 rounded-2xl"
              style={{ background: 'rgba(13,107,94,0.04)', border: '1px solid rgba(13,107,94,0.12)' }}>
              <div>
                <p className="font-semibold" style={{ color: '#1a3530' }}>Profile Visibility</p>
                <p className="text-sm mt-0.5" style={{ color: '#8aada5' }}>
                  {form.isPublicProfile ? '🌍 Visible to all members' : '🔒 Only you can see your profile'}
                </p>
              </div>
              <button id="profile-privacy-toggle" type="button"
                onClick={() => setForm({ ...form, isPublicProfile: !form.isPublicProfile })}
                style={{
                  width: '52px', height: '28px',
                  background: form.isPublicProfile ? 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' : 'rgba(203,213,225,0.6)',
                  borderRadius: '99px', border: '1px solid rgba(13,107,94,0.2)',
                  transition: 'all 0.3s', cursor: 'pointer', position: 'relative', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', top: '3px', left: form.isPublicProfile ? '27px' : '3px',
                  width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                  transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(13,107,94,0.25)',
                }} />
              </button>
            </div>

            <button id="save-profile-btn" type="submit" disabled={saving} className="btn-primary w-full py-4">
              {saving ? 'Saving...' : saved ? '✅ Profile Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Referral / Share Card */}
        <div className="glass p-6" style={{ border: '1px solid rgba(13,107,94,0.15)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="font-bold" style={{ color: '#1a3530' }}>Invite a Friend</p>
              <p className="text-xs" style={{ color: '#8aada5' }}>Know someone living with chronic illness? Share SoulH with them.</p>
            </div>
          </div>
          <button onClick={handleCopyLink} className="btn-ghost w-full py-3 text-sm">
            {copied ? '✅ Link Copied!' : '🔗 Copy Referral Link'}
          </button>
        </div>

        {/* Request Verification (Only for Users) */}
        {profile.role === 'USER' && !profile.verified && (
          <div className="glass p-6" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(245,158,11,0.05))' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏥</span>
              <div>
                <p className="font-bold" style={{ color: '#1a3530' }}>Get Verified Patient Badge</p>
                <p className="text-xs" style={{ color: '#8aada5' }}>Upload your medical records for doctor review to get a verified badge.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <input 
                type="file" 
                id="proof-upload" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  addToast('Uploading document...', 'info');
                  try {
                    const uploadRes = await api.post('/api/files/upload', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    
                    const fileName = uploadRes.data;
                    await api.post('/api/users/submit-proof', { proofUrl: fileName });
                    addToast('Verification request submitted successfully!', 'success');
                  } catch (err) {
                    addToast(err.response?.data?.message || 'Upload failed.', 'error');
                  }
                }}
              />
              <label 
                htmlFor="proof-upload" 
                className="w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center cursor-pointer transition hover:opacity-90" 
                style={{ background: '#f59e0b', color: 'white' }}
              >
                📁 Choose File & Submit
              </label>
              <p className="text-[10px] text-center" style={{ color: '#8aada5' }}>PDF, JPG, or PNG max 5MB. Sensitive data will be handled securely.</p>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="glass p-7" style={{ border: '1px solid rgba(220,38,38,0.12)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#dc2626' }}>
            ⚠️ Account
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: '#1a3530' }}>Sign Out</p>
              <p className="text-sm" style={{ color: '#8aada5' }}>You'll need to sign in again to access SoulH.</p>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              Logout
            </button>
          </div>
        </div>

        <div className="text-center pb-4">
          <Link to="/dashboard" className="text-sm font-semibold hover:underline" style={{ color: '#0d6b5e' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
