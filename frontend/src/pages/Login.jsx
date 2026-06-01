import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Dynamically load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleGoogleCallback = async ({ credential }) => {
    setGLoading(true);
    try {
      const data = await loginWithGoogle(credential);
      addToast(`Welcome, ${data.name?.split(' ')[0]}! 💙`, 'success');
      navigate('/dashboard');
    } catch {
      addToast('Google sign-in failed. Please try again.', 'error');
    } finally {
      setGLoading(false);
    }
  };

  const promptGoogle = () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
      // Mock Google Sign-In fallback for local development/presentation
      setGLoading(true);
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({ 
        email: "tanisha10433@gmail.com", 
        name: "Tanisha Sharma", 
        sub: "mock-google-sub-12345" 
      }));
      const mockToken = `${header}.${payload}.mock_signature`;

      setTimeout(() => {
        handleGoogleCallback({ credential: mockToken });
      }, 800);
      return;
    }
    window.google?.accounts.id.prompt();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      addToast(`Welcome back, ${data.name.split(' ')[0]}! 💙`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Invalid email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Soft orbs */}
      <div className="orb w-[600px] h-[600px] top-[-200px] left-[-200px]" style={{ background: 'rgba(100,190,175,0.22)', animationDelay: '0s' }} />
      <div className="orb w-[400px] h-[400px] bottom-[-100px] right-[-100px]" style={{ background: 'rgba(94,234,212,0.16)', animationDelay: '4s' }} />

      {/* Left Decorative Panel (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative z-10 p-12"
        style={{ background: 'rgba(13,107,94,0.04)', borderRight: '1px solid rgba(100,190,175,0.15)' }}
      >
        <Link to="/" className="flex items-center gap-3">
          <span className="text-3xl">💙</span>
          <span className="text-2xl font-black gradient-text-teal">SoulH</span>
        </Link>

        <div>
          <p className="text-5xl font-black text-slate-700 leading-tight mb-6">
            You are not<br />
            <span className="gradient-text">alone</span> in this.
          </p>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Millions of people manage chronic illness every day. SoulH connects you with those who truly understand.
          </p>

          {/* Testimonial card */}
          <div className="mt-10 glass p-6">
            <p className="text-slate-500 text-sm italic leading-relaxed mb-4">
              "Finding someone with the same condition changed everything for me. I finally felt heard."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-sm font-black text-white">A</div>
              <div>
                <p className="text-slate-700 text-sm font-semibold">Ayesha R.</p>
                <p className="text-slate-400 text-xs">Living with Lupus — SoulH Member</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-300 text-sm">© 2025 SoulH. Peer support, not medical advice.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6 py-16">
        <div className="w-full max-w-md page-enter">

          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <span className="text-2xl">💙</span>
            <span className="text-xl font-black gradient-text-teal">SoulH</span>
          </Link>

          <div className="glass p-8 md:p-10">
            <div className="mb-8">
              <p className="font-semibold font-semibold text-sm mb-2 tracking-wide">WELCOME BACK</p>
              <h2 className="text-3xl font-black text-slate-800">Sign in to SoulH</h2>
              <p className="text-slate-400 mt-2 text-sm">Continue your support journey</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="field-label">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">✉</span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="input-field"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔑</span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    className="input-field"
                    style={{ paddingLeft: '42px', paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition text-sm"
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-2">
                {loading ? (
                  <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />Signing in...</>
                ) : 'Sign In →'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'rgba(100,190,175,0.2)' }} />
              <span className="text-slate-300 text-xs font-medium">NEW TO SOULH?</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(100,190,175,0.2)' }} />
            </div>

            <Link to="/signup" className="btn-ghost w-full py-3.5 text-sm mb-4">
              Create a free account
            </Link>

            {/* ── Google Sign-In ──────────────────────────────── */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(100,190,175,0.2)' }} />
              <span className="text-slate-300 text-xs font-medium">OR</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(100,190,175,0.2)' }} />
            </div>

            <button
              id="google-signin-btn"
              type="button"
              onClick={promptGoogle}
              disabled={gLoading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition hover:shadow-md mb-4"
              style={{ background: 'white', color: '#374151', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
              {gLoading ? (
                <span className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {gLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Quick Demo Logins */}
            <div className="pt-4 border-t border-teal-100/30">
              <p className="text-xs font-bold text-slate-400 mb-3 text-center uppercase tracking-widest">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ email: 'dr.arjun@soulh.demo', password: 'Demo@1234' })} className="py-2 px-3 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition whitespace-nowrap overflow-hidden text-ellipsis">
                  👨‍⚕️ Doctor (Verified)
                </button>
                <button type="button" onClick={() => setForm({ email: 'priya@soulh.demo', password: 'Demo@1234' })} className="py-2 px-3 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition whitespace-nowrap overflow-hidden text-ellipsis">
                  🙍‍♀️ Patient
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
