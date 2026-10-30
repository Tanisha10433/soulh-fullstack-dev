import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'https://soulh-backend.onrender.com';
const api = axios.create({
  baseURL,
  timeout: 45000,
});

// Keep Render free tier warm — ping every 14 minutes
const PING_INTERVAL_MS = 14 * 60 * 1000;
const pingBackend = () => axios.get(`${baseURL}/api/auth/health`).catch(() => {});
setInterval(pingBackend, PING_INTERVAL_MS);

// Automatically attach JWT to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soulh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
