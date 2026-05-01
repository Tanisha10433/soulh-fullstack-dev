import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { initE2EKeys } from '../crypto/e2e';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load: restore user from localStorage, then verify token is still valid
  useEffect(() => {
    const stored = localStorage.getItem('soulh_user');
    const token = localStorage.getItem('soulh_token');

    if (!stored || !token) {
      setLoading(false);
      return;
    }

    // Verify the token is still accepted by the backend
    // (After a backend restart with H2 in-memory DB, users are wiped — token becomes invalid)
    api.get('/api/users/me')
      .then(() => {
        // Token is valid — restore user
        setUser(JSON.parse(stored));
      })
      .catch(() => {
        // Token rejected (DB wiped or expired) — clear stale state silently
        localStorage.removeItem('soulh_token');
        localStorage.removeItem('soulh_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('soulh_token', data.token);
    localStorage.setItem('soulh_refresh_token', data.refreshToken);
    localStorage.setItem('soulh_user', JSON.stringify(data));
    setUser(data);
    // Initialize E2E keys (generates if new, uploads public key)
    if (data.id) {
      const pubKey = await initE2EKeys(data.id);
      api.post('/api/users/me/public-key', { publicKey: pubKey }).catch(() => {});
    }
    return data;
  };

  const loginWithGoogle = async (idToken) => {
    const { data } = await api.post('/api/auth/oauth2/google', { idToken });
    localStorage.setItem('soulh_token', data.token);
    localStorage.setItem('soulh_user', JSON.stringify(data));
    setUser(data);
    if (data.id) {
      const pubKey = await initE2EKeys(data.id);
      api.post('/api/users/me/public-key', { publicKey: pubKey }).catch(() => {});
    }
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('soulh_token', data.token);
    localStorage.setItem('soulh_refresh_token', data.refreshToken);
    localStorage.setItem('soulh_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('soulh_token');
    localStorage.removeItem('soulh_refresh_token');
    localStorage.removeItem('soulh_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/api/users/me');
      localStorage.setItem('soulh_user', JSON.stringify(data));
      setUser(data);
    } catch (err) {
      console.error("Failed to refresh user", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
