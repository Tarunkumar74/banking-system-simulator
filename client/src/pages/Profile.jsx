import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Card, Field, Btn, PageTitle, Row } from '../components/ui';
import { dt } from '../utils/format';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [acc, setAcc] = useState(null);
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  useEffect(() => { api.get('/accounts/me').then((r) => setAcc(r.data.account)).catch((e) => toast.error(errMsg(e))); }, []);
  const saveName = async (e) => {
    e.preventDefault();
    try { setUser((await api.patch('/users/me', { name })).data.user); toast.success('Profile updated'); } catch (err) { toast.error(errMsg(err)); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api.post('/auth/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed'); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="max-w-xl space-y-4">
      <PageTitle title="Profile and settings" />
      <Card className="space-y-2 text-sm"><Row k="Name" v={user.name} /><Row k="Email" v={user.email} /><Row k="Member since" v={dt(user.createdAt)} />
        {acc && <><Row k="Account" v={`Savings · ${acc.maskedNumber}`} /><Row k="Status" v={acc.status} /><Row k="Opened" v={dt(acc.createdAt)} /></>}</Card>
      <Card className="flex items-center justify-between"><div><h2 className="font-medium text-slate-900">Theme</h2><p className="text-sm text-slate-500">{dark ? 'Dark' : 'Light'} mode is on. Saved on this device.</p></div>
        <Btn variant="ghost" onClick={toggle}>Switch to {dark ? 'light' : 'dark'}</Btn></Card>
      <Card><form onSubmit={saveName} className="space-y-3"><h2 className="font-medium text-slate-900">Your name</h2><Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /><Btn>Save name</Btn></form></Card>
      <Card><form onSubmit={savePw} className="space-y-3"><h2 className="font-medium text-slate-900">Change password</h2>
        <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number." value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
        <Btn>Update password</Btn></form></Card>
      <Btn variant="danger" onClick={logout}>Log out</Btn>
    </div>
  );
}
