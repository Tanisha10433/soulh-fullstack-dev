import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// Automatically attach JWT to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soulh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('soulh_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('http://localhost:8080/api/auth/refresh', { refreshToken });
          localStorage.setItem('soulh_token', data.accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
