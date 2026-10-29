import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';
import { Field, Btn } from '../components/ui';

function AuthForm({ mode }) {
  const reg = mode === 'register';
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await (reg ? register(f) : login({ email: f.email, password: f.password })); toast.success(reg ? 'Account created with ₹10,000 demo credit' : 'Welcome back'); nav('/dashboard'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-navy p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-7 shadow-xl">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900"><Landmark className="text-teal-500" />BankSim</Link>
        <h1 className="text-xl font-semibold text-slate-900">{reg ? 'Create your demo account' : 'Log in'}</h1>
        {reg && <Field label="Full name" value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" />}
        <Field label="Email" type="email" value={f.email} onChange={set('email')} required autoComplete="email" />
        <Field label="Password" type="password" value={f.password} onChange={set('password')} required autoComplete={reg ? 'new-password' : 'current-password'}
          hint={reg ? 'At least 8 characters with a letter and a number.' : undefined} />
        <Btn className="w-full" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</Btn>
        <p className="text-center text-sm text-slate-500">{reg ? 'Already registered?' : 'New here?'}{' '}
          <Link className="font-medium text-teal-600" to={reg ? '/login' : '/register'}>{reg ? 'Log in' : 'Create an account'}</Link></p>
      </form>
    </div>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
