import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !/\/auth\/(login|register)/.test(e.config.url)) {
    localStorage.removeItem('token');
    if (location.pathname !== '/login') location.href = '/login';
  }
  return Promise.reject(e);
});
export const errMsg = (e) => e.response?.data?.message || (e.request ? 'Cannot reach the server. Is the API running?' : e.message);
