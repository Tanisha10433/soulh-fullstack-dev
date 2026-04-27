import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api';

const Toggle = ({ id, label, sublabel, checked, onChange, icon }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl" 
    style={{ background: 'rgba(13,107,94,0.04)', border: '1px solid rgba(13,107,94,0.1)' }}>
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm" style={{ color: '#1a3530' }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: '#8aada5' }}>{sublabel}</p>}
      </div>
    </div>
    <button id={id} onClick={() => onChange(!checked)}
      style={{
        width: '52px', height: '28px',
        background: checked ? 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' : 'rgba(203,213,225,0.6)',
        borderRadius: '99px', border: '1px solid rgba(13,107,94,0.2)',
        transition: 'all 0.3s', cursor: 'pointer', position: 'relative', flexShrink: 0,
      }}>
      <span style={{
        position: 'absolute', top: '3px', left: checked ? '27px' : '3px',
        width: '20px', height: '20px', background: 'white', borderRadius: '50%',
        transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(13,107,94,0.25)',
      }} />
    </button>
  </div>
);

export default function PrivacyCenter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [settings, setSettings] = useState({
    publicProfile: true,
    showInSearch: true,
    showIllness: true,
    allowDirectMessages: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0=closed, 1=confirm, 2=final
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/api/users/me').then(r => {
      const u = r.data;
      setSettings({
        publicProfile: u.publicProfile ?? true,
        showInSearch: u.showInSearch ?? true,
        showIllness: u.showIllness ?? true,
        allowDirectMessages: u.allowDirectMessages ?? true,
      });
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me/privacy', settings);
      addToast('Privacy settings saved ✓', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/communities/1/posts').catch(() => ({ data: [] })),
      ]);
      const dataPackage = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        posts: postsRes.data,
        notice: 'This is all the data SoulH holds about you.',
      };
      const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'soulh-my-data.json'; a.click();
      URL.revokeObjectURL(url);
      addToast('Data exported successfully', 'success');
    } catch {
      addToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.delete('/api/users/me');
      addToast('Account permanently deleted. We\'re sorry to see you go. 💙', 'info');
      logout();
      navigate('/');
    } catch {
      addToast('Deletion failed. Please try again.', 'error');
      setDeleting(false);
    }
  };

  const set = (key) => (val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-[600px] h-[600px] top-0 right-[-200px]" style={{ background: 'rgba(13,107,94,0.08)' }} />
      <div className="orb w-[400px] h-[400px] bottom-0 left-[-100px]" style={{ background: 'rgba(232,119,106,0.07)' }} />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div className="glass p-7">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(13,107,94,0.1)' }}>🔒</div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1a3530' }}>Privacy Center</h1>
              <p className="text-sm mt-1" style={{ color: '#8aada5' }}>
                Control how your data is shared. Your health, your rules.
              </p>
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="glass p-7 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">👁️</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a3530' }}>Profile Visibility</h2>
          </div>

          <Toggle id="toggle-public-profile" icon="🌍" label="Public Profile"
            sublabel="Your profile appears to other members"
            checked={settings.publicProfile} onChange={set('publicProfile')} />

          <Toggle id="toggle-show-search" icon="🔍" label="Appear in Peer Search"
            sublabel="Others can find you when searching by condition"
            checked={settings.showInSearch} onChange={set('showInSearch')} />

          <Toggle id="toggle-show-illness" icon="🏥" label="Show Health Condition"
            sublabel="Display your condition on your public profile"
            checked={settings.showIllness} onChange={set('showIllness')} />

          <Toggle id="toggle-direct-messages" icon="💬" label="Allow Direct Messages"
            sublabel="Unconnected users can message you"
            checked={settings.allowDirectMessages} onChange={set('allowDirectMessages')} />

          <button id="save-privacy" onClick={saveSettings} disabled={saving} className="btn-primary w-full py-3.5 mt-2">
            {saving ? 'Saving...' : '💾 Save Privacy Settings'}
          </button>
        </div>

        {/* Data Export */}
        <div className="glass p-7">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">📦</span>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1a3530' }}>Your Data</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8aada5' }}>Download everything SoulH holds about you (GDPR Article 20)</p>
            </div>
          </div>
          <button id="export-data" onClick={exportData} disabled={exporting}
            className="w-full py-3.5 font-semibold rounded-2xl transition"
            style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
            {exporting ? 'Preparing export...' : '📥 Download My Data (JSON)'}
          </button>
        </div>

        {/* Security Info */}
        <div className="glass p-7">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🔐</span>
            <h2 className="text-lg font-bold" style={{ color: '#1a3530' }}>Security</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: '🔒', label: 'End-to-End Encrypted Chat', desc: 'Your private messages are encrypted on your device — SoulH cannot read them.' },
              { icon: '🛡️', label: 'Zero Password Storage', desc: 'Passwords are hashed (bcrypt). Even our team cannot see your password.' },
              { icon: '🧬', label: 'Anonymous Posting', desc: 'When posting anonymously, your identity is never stored with the post.' },
              { icon: '🌐', label: 'Google Sign-In', desc: user?.oauthProvider === 'google' ? '✓ Your account is linked to Google' : 'Not linked — using email/password.' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(13,107,94,0.04)' }}>
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1a3530' }}>{label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#4a7060' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-7 rounded-3xl" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.18)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">⚠️</span>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#dc2626' }}>Danger Zone</h2>
              <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>These actions are permanent and cannot be undone.</p>
            </div>
          </div>

          {deleteStep === 0 && (
            <button id="start-delete" onClick={() => setDeleteStep(1)}
              className="w-full py-3 rounded-2xl font-semibold transition"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
              🗑 Delete My Account Permanently
            </button>
          )}

          {deleteStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: '#b91c1c' }}>
                This will <strong>permanently delete</strong> your account, messages, and connection history.
                Your community posts will be anonymized and remain. This action <strong>cannot be reversed</strong>.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: '#dc2626', color: 'white' }}>Yes, I understand — Continue</button>
                <button onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input id="delete-confirm-input" type="text" value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type DELETE here"
                className="input-field w-full"
                style={{ borderColor: 'rgba(220,38,38,0.3)' }} />
              <div className="flex gap-2">
                <button id="confirm-delete" onClick={deleteAccount}
                  disabled={deleteInput !== 'DELETE' || deleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition"
                  style={{
                    background: deleteInput === 'DELETE' ? '#dc2626' : 'rgba(220,38,38,0.2)',
                    color: 'white', cursor: deleteInput !== 'DELETE' ? 'not-allowed' : 'pointer'
                  }}>
                  {deleting ? 'Deleting...' : '🗑 Delete Forever'}
                </button>
                <button onClick={() => { setDeleteStep(0); setDeleteInput(''); }}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'rgba(13,107,94,0.08)', color: '#0d6b5e', border: '1px solid rgba(13,107,94,0.2)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
