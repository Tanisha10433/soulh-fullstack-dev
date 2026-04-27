import React from 'react';
import { Link } from 'react-router-dom';

const CONDITIONS = ['Diabetes', 'Anxiety', 'Lupus', 'PCOS', 'Fibromyalgia', 'Arthritis'];

export default function Footer() {
  return (
    <footer
      className="relative z-10 mt-auto"
      style={{ borderTop: '1px solid rgba(13,107,94,0.1)', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🫀</span>
              <span className="text-xl font-black gradient-text-teal">SoulH</span>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#4a7060' }}>
              A free peer-to-peer support platform for people living with chronic illness. Connect, share your journey, and heal together with people who truly understand.
            </p>
            <div className="flex gap-3 flex-wrap">
              {['🔒 Privacy First', '🎤 Voice Ready', '👨‍⚕️ Doctor Verified'].map(badge => (
                <span key={badge} className="badge badge-teal text-xs">{badge}</span>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: '#0d6b5e' }}>Platform</p>
            <div className="space-y-3">
              {[
                { to: '/',          label: 'Home' },
                { to: '/signup',    label: 'Join Free' },
                { to: '/login',     label: 'Sign In' },
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/profile',   label: 'My Profile' },
              ].map(({ to, label }) => (
                <Link
                  key={label} to={to}
                  className="block text-sm font-medium transition hover:underline"
                  style={{ color: '#4a7060' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div>
            <p className="font-bold text-xs uppercase tracking-widest mb-4" style={{ color: '#0d6b5e' }}>Conditions</p>
            <div className="space-y-3">
              {CONDITIONS.map(c => (
                <Link
                  key={c} to="/signup"
                  className="block text-sm font-medium transition hover:underline"
                  style={{ color: '#4a7060' }}
                >
                  {c} Peers →
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(13,107,94,0.1)' }}>
          <p className="text-xs font-medium" style={{ color: '#8aada5' }}>
            © 2025 SoulH — Built with 🫀 for the chronic illness community. All rights reserved.
          </p>
          <div className="flex items-start gap-2 text-xs p-3 rounded-xl"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#b91c1c', maxWidth: '380px' }}>
            <span className="flex-shrink-0">⚠️</span>
            <span><strong>Medical Disclaimer:</strong> SoulH is for peer support only — not medical advice, diagnosis, or treatment. Always consult a licensed medical professional.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
