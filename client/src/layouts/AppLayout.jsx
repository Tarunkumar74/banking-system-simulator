import { useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, MinusCircle, Send, History, BarChart3, User, LogOut, Menu, X, Landmark, Wallet, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Skeleton } from '../components/ui';

const links = [
  ['/dashboard', 'Dashboard', LayoutDashboard], ['/account', 'Account', Wallet], ['/deposit', 'Deposit', PlusCircle], ['/withdraw', 'Withdraw', MinusCircle],
  ['/transfer', 'Transfer', Send], ['/history', 'History', History], ['/analytics', 'Analytics', BarChart3], ['/profile', 'Profile', User],
];
export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const nav = (
    <nav className="flex h-full flex-col bg-navy p-4 text-slate-300" aria-label="Main">
      <div className="mb-8 flex items-center gap-2 px-2 text-white"><Landmark className="text-cyan-300" /><span className="font-semibold">BankSim</span></div>
      <div className="space-y-1">
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? 'bg-navy-2 text-cyan-300' : 'hover:bg-navy-2/60'}`}>
            <Icon size={18} />{label}</NavLink>))}
      </div>
      <div className="mt-auto space-y-1">
        <button onClick={toggle} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-navy-2/60">{dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? 'Light mode' : 'Dark mode'}</button>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-navy-2/60"><LogOut size={18} />Log out</button>
      </div>
    </nav>
  );
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">{nav}</aside>
      <div className="flex items-center justify-between bg-navy px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-semibold"><Landmark size={18} className="text-cyan-300" />BankSim</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
      </div>
      {open && <div className="fixed inset-0 z-40 md:hidden"><div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
        <div className="relative h-full w-64">{nav}<button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div></div>}
      <main className="min-w-0 flex-1 p-4 md:p-8"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
    </div>
  );
}
