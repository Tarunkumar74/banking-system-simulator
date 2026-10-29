import { Link, Navigate } from 'react-router-dom';
import { Landmark, ShieldCheck, Send, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  const feats = [[ShieldCheck, 'Secure by design', 'JWT sessions, hashed passwords and server-side checks on every money movement.'],
    [Send, 'Safe demo transfers', 'Move simulated money between accounts with duplicate-submission protection.'],
    [BarChart3, 'Clear analytics', 'Monthly cash flow and activity charts built from your real transaction records.']];
  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <span className="flex items-center gap-2 font-semibold"><Landmark className="text-cyan-300" />BankSim</span>
        <div className="flex gap-3 text-sm"><Link to="/login" className="px-3 py-2 text-slate-300">Log in</Link>
          <Link to="/register" className="rounded-xl bg-teal-500 px-4 py-2 font-medium">Create account</Link></div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">Learn how a bank ledger works, with simulated money.</h1>
        <p className="mt-5 max-w-xl text-slate-300">Deposit, withdraw and transfer ₹ between demo accounts. Every balance comes from a real database and nothing here touches real funds.</p>
        <Link to="/register" className="mt-8 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-medium text-navy">Open a demo account</Link>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-16 md:grid-cols-3">
        {feats.map(([Icon, t, d]) => <div key={t} className="rounded-2xl bg-navy-2 p-5"><Icon className="text-cyan-300" /><h3 className="mt-3 font-medium">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p></div>)}
      </section>
      <footer className="pb-8 text-center text-xs text-slate-500">Educational simulator. Not a real bank. All money and accounts are demo data.</footer>
    </div>
  );
}
