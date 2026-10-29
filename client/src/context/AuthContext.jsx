import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);
  const authenticate = useCallback(async (path, body) => {
    const { data } = await api.post(path, body);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* token is discarded either way */ }
    localStorage.removeItem('token'); setUser(null);
  }, []);
  return <Ctx.Provider value={{ user, setUser, loading, login: (b) => authenticate('/auth/login', b), register: (b) => authenticate('/auth/register', b), logout }}>{children}</Ctx.Provider>;
}
