import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorProfilePage from './pages/DoctorProfilePage';
import ConsultationList from './pages/ConsultationList';
import DoctorPatientList from './pages/DoctorPatientList';
import DoctorInsights from './pages/DoctorInsights';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import PrivacyCenter from './pages/PrivacyCenter';
import DoctorOnboarding from './pages/DoctorOnboarding';
import DoctorsList from './pages/DoctorsList';
import DoctorProfile from './pages/DoctorProfile';
import BookConsultation from './pages/BookConsultation';
import MyConsultations from './pages/MyConsultations';
import Community from './pages/Community';
import Footer from './components/Footer';
import api from './api';

import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function Navbar() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const { unreadCount, notifications, markAllNotificationsAsRead } = useWebSocket();
  const [pendingCount, setPendingCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) { setPendingCount(0); return; }
    api.get('/api/connections/pending').then(r => setPendingCount(r.data.length)).catch(() => {});
  }, [user, notifications]); // Refresh count when new notifications arrive

  const navLinks = user ? [
    { to: '/dashboard',     label: 'Dashboard', badge: pendingCount > 0 ? pendingCount : null },
    { to: '/community',     label: '🌍 Community' },
    { to: '/doctors',       label: '🩺 Doctors' },
    { to: '/consultations', label: '📅 Consultations' },
    { to: '/profile',       label: 'Profile' },
    { to: '/privacy',       label: '🔒 Privacy' },
    ...(user.role === 'DOCTOR' ? [{ to: '/doctor', label: '👨‍⚕️ Doctor Portal', highlight: true }] : []),
    ...(user.role === 'ADMIN'  ? [{ to: '/admin',  label: '👑 Admin Panel',    highlight: true }] : []),
  ] : [
    { to: '/login', label: 'Sign In' },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? (isDarkMode ? 'rgba(12,20,18,0.96)' : 'rgba(255,255,255,0.96)') : (isDarkMode ? 'rgba(12,20,18,0.82)' : 'rgba(255,255,255,0.82)'),
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: isDarkMode ? '1px solid rgba(13,107,94,0.2)' : '1px solid rgba(13,107,94,0.12)',
          boxShadow: scrolled ? (isDarkMode ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(13,107,94,0.08)') : 'none',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🫀</span>
            <div>
              <span className="text-xl font-black gradient-text-teal tracking-tight">SoulH</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl mr-2 transition hover:bg-teal-50"
              style={{ background: 'rgba(13,107,94,0.05)', color: '#0d6b5e' }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {user && (
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl mr-2 transition hover:bg-teal-50"
                  style={{ background: 'rgba(13,107,94,0.05)', color: '#0d6b5e' }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-black animate-bounce"
                      style={{ background: '#e8776a', fontSize: '10px' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 glass p-2 z-[60] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between p-3 border-b border-teal-50">
                      <h3 className="font-bold text-sm" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>Notifications</h3>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button onClick={markAllNotificationsAsRead} className="text-xs text-[#0d6b5e] font-black hover:underline transition">Clear All</button>
                        )}
                        <button onClick={() => setShowNotifications(false)} className="text-xs text-teal-600 font-bold">Close</button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-2xl mb-2">🎈</p>
                          <p className="text-xs font-semibold" style={{ color: '#8aada5' }}>All caught up!</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 hover:bg-teal-50/30 rounded-lg transition border-b border-teal-50 last:border-0 cursor-default">
                            <div className="flex gap-3">
                              <span className="text-lg">{n.type === 'CONNECTION_REQUEST' ? '🤝' : n.type === 'REQUEST_ACCEPTED' ? '✨' : '📝'}</span>
                              <div>
                                <p className="text-xs font-medium leading-relaxed" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>{n.message}</p>
                                <p className="text-[10px] mt-1" style={{ color: '#8aada5' }}>{new Date(n.createdAt).toLocaleTimeString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {navLinks.map(link => (
              <Link
                key={link.to} to={link.to}
                className="relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200"
                style={{
                  color: link.highlight ? '#0d6b5e' : (isDarkMode ? '#8aada5' : '#4a7060'),
                  background: link.highlight ? 'rgba(13,107,94,0.07)' : 'transparent',
                  border: link.highlight ? '1px solid rgba(13,107,94,0.18)' : '1px solid transparent',
                }}
              >
                {link.label}
                {link.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white font-black"
                    style={{ background: '#e8776a', fontSize: '10px' }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => logout()}
                className="ml-2 px-4 py-2 text-sm font-semibold rounded-xl transition"
                style={{ color: '#e8776a', background: 'rgba(232,119,106,0.07)', border: '1px solid rgba(232,119,106,0.2)' }}
              >
                Logout
              </button>
            ) : (
              <Link to="/signup" className="btn-primary ml-2" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px' }}>
                Join Free →
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl transition hover:bg-teal-50"
              style={{ background: 'rgba(13,107,94,0.05)', color: '#0d6b5e' }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-1.5 p-2 rounded-xl transition"
              style={{ background: mobileOpen ? 'rgba(13,107,94,0.09)' : 'transparent' }}
              aria-label="Toggle menu"
            >
              <span className="block w-5 h-0.5 transition-all duration-300" style={{ background: '#0d6b5e', transform: mobileOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
              <span className="block w-5 h-0.5 transition-all duration-300" style={{ background: '#0d6b5e', opacity: mobileOpen ? 0 : 1 }} />
              <span className="block w-5 h-0.5 transition-all duration-300" style={{ background: '#0d6b5e', transform: mobileOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <div
          style={{
            maxHeight: mobileOpen ? '500px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease',
            borderTop: mobileOpen ? (isDarkMode ? '1px solid rgba(13,107,94,0.2)' : '1px solid rgba(13,107,94,0.1)') : 'none',
            background: isDarkMode ? 'rgba(12,20,18,0.97)' : 'rgba(255,255,255,0.97)',
          }}
        >
          <div className="px-6 py-4 space-y-2">
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'rgba(13,107,94,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: '#8aada5' }}>{user.role}</p>
                </div>
              </div>
            )}
            {navLinks.map(link => (
              <Link
                key={link.to} to={link.to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition"
                style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530', background: 'rgba(13,107,94,0.04)' }}
              >
                {link.label}
                {link.badge && <span className="badge badge-coral">{link.badge} new</span>}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full p-3 rounded-xl text-sm font-bold text-left mt-2"
                style={{ color: '#e8776a', background: 'rgba(232,119,106,0.07)', border: '1px solid rgba(232,119,106,0.18)' }}
              >
                Logout
              </button>
            ) : (
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="btn-primary w-full py-3 mt-2" style={{ display: 'block', textAlign: 'center' }}>
                Join Free →
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

function NotFound() {
  const { isDarkMode } = useTheme();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="orb w-[400px] h-[400px] top-[-100px] left-[20%]" style={{ background: 'rgba(13,107,94,0.12)' }} />
      <div className="relative z-10">
        <p className="text-8xl font-black gradient-text leading-none mb-4">404</p>
        <h1 className="text-3xl font-bold mb-3" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>Page not found</h1>
        <p className="mb-8" style={{ color: '#8aada5' }}>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary px-8 py-3">← Go Home</Link>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: isDarkMode ? '#0c1412' : '#f0faf8' }}>
      <div className="flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl animate-pulse"
          style={{ background: 'linear-gradient(135deg,#0d6b5e,#0f8b7a)' }}>🫀</div>
        <div className="flex items-center gap-3" style={{ color: '#0d6b5e' }}>
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="font-semibold" style={{ color: isDarkMode ? '#e2e8f0' : '#1a3530' }}>Loading SoulH...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className={isChat ? '' : 'pt-16 flex-1'}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/login"     element={!user ? <Login />    : <Navigate to="/dashboard" />} />
          <Route path="/signup"    element={!user ? <Signup />   : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user  ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/profile"   element={user  ? <Profile />   : <Navigate to="/login" />} />
          <Route path="/privacy"   element={user  ? <PrivacyCenter /> : <Navigate to="/login" />} />
          <Route path="/chat/:userId" element={user ? <Chat />    : <Navigate to="/login" />} />
          <Route path="/community" element={user  ? <Community /> : <Navigate to="/login" />} />
          <Route path="/doctors"   element={user  ? <DoctorsList />   : <Navigate to="/login" />} />
          <Route path="/doctors/:doctorId" element={user ? <DoctorProfile /> : <Navigate to="/login" />} />
          <Route path="/doctors/:doctorId/book" element={user ? <BookConsultation /> : <Navigate to="/login" />} />
          <Route path="/consultations" element={user ? <MyConsultations /> : <Navigate to="/login" />} />
          <Route path="/doctor"    element={user?.role === 'DOCTOR' ? <DoctorDashboard /> : <Navigate to="/dashboard" />} />
          <Route path="/doctor/profile" element={user?.role === 'DOCTOR' ? <DoctorProfilePage /> : <Navigate to="/dashboard" />} />
          <Route path="/doctor/consultations" element={user?.role === 'DOCTOR' ? <ConsultationList /> : <Navigate to="/dashboard" />} />
          <Route path="/doctor/patients" element={user?.role === 'DOCTOR' ? <DoctorPatientList /> : <Navigate to="/dashboard" />} />
          <Route path="/doctor/content" element={user?.role === 'DOCTOR' ? <DoctorInsights /> : <Navigate to="/dashboard" />} />
          <Route path="/doctor/onboarding" element={user?.role === 'DOCTOR' ? <DoctorOnboarding /> : <Navigate to="/dashboard" />} />
          <Route path="/admin"     element={user?.role === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/dashboard" />} />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </div>
      {!isChat && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <WebSocketProvider>
              <AppRoutes />
            </WebSocketProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
