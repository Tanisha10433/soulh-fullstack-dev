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
      .then((res) => {
        // Token is valid — update/restore user from fresh API data
        setUser(res.data);
        localStorage.setItem('soulh_user', JSON.stringify(res.data));
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
    // Store token first so subsequent API calls work
    localStorage.setItem('soulh_token', data.token);
    if (data.refreshToken) localStorage.setItem('soulh_refresh_token', data.refreshToken);

    // Fetch full user profile to guarantee all fields (including id) are present
    let userObj = data;
    try {
      const meRes = await api.get('/api/users/me');
      userObj = { ...data, ...meRes.data }; // merge: fresh profile overrides auth response
    } catch (e) {
      // Fallback to auth response data if /me fails
    }
    localStorage.setItem('soulh_user', JSON.stringify(userObj));
    setUser(userObj);

    // Initialize E2E keys
    if (userObj.id) {
      const pubKey = await initE2EKeys(userObj.id);
      api.post('/api/users/me/public-key', { publicKey: pubKey }).catch(() => {});
    }
    return userObj;
  };

  const loginWithGoogle = async (idToken) => {
    const { data } = await api.post('/api/auth/oauth2/google', { idToken });
    localStorage.setItem('soulh_token', data.token);

    // Fetch full profile so id and all fields are present
    let userObj = data;
    try {
      const meRes = await api.get('/api/users/me');
      userObj = { ...data, ...meRes.data };
    } catch (e) {}
    localStorage.setItem('soulh_user', JSON.stringify(userObj));
    setUser(userObj);

    if (userObj.id) {
      const pubKey = await initE2EKeys(userObj.id);
      api.post('/api/users/me/public-key', { publicKey: pubKey }).catch(() => {});
    }
    return userObj;
  };

  const register = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    localStorage.setItem('soulh_token', data.token);
    if (data.refreshToken) localStorage.setItem('soulh_refresh_token', data.refreshToken);

    // Fetch full profile to ensure id is stored correctly
    let userObj = data;
    try {
      const meRes = await api.get('/api/users/me');
      userObj = { ...data, ...meRes.data };
    } catch (e) {}
    localStorage.setItem('soulh_user', JSON.stringify(userObj));
    setUser(userObj);
    return userObj;
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
