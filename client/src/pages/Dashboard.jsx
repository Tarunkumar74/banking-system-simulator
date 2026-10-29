import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowDownLeft, ArrowUpRight, PlusCircle, MinusCircle, Send, History, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api, errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Skeleton, TxList, PageTitle, Empty } from '../components/ui';
import { inr, TYPE_LABEL } from '../utils/format';

export const COLORS = ['#14b8a6', '#f43f5e', '#0ea5e9', '#f59e0b'];
export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  useEffect(() => {
    Promise.all([api.get('/accounts/me'), api.get('/analytics/summary'), api.get('/analytics/monthly'), api.get('/analytics/distribution'), api.get('/transactions?limit=5')])
      .then(([a, s, m, dist, t]) => setD({ acc: a.data.account, s: s.data, m: m.data.items, dist: dist.data.items, tx: t.data.items }))
      .catch((e) => setErr(errMsg(e)));
  }, []);
  if (err) return <Card><Empty title="Could not load your dashboard" sub={err} /></Card>;
  if (!d) return <div className="space-y-4"><Skeleton className="h-28" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div><Skeleton className="h-64" /></div>;
  const { acc, s, m, dist, tx } = d;
  const chart = m.map((x) => ({ month: x.period, Income: x.income / 100, Expenses: x.expense / 100 }));
  return (
    <div className="space-y-6">
      <PageTitle title={`Welcome, ${user.name.split(' ')[0]}`} sub="Demo account. All money here is simulated." />
      <div className="rounded-2xl bg-navy p-6 text-white">
        <div className="flex items-start justify-between">
          <div><p className="text-sm text-slate-400">Available balance</p><p className="mt-1 text-3xl font-semibold text-cyan-300">{inr(acc.balance)}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs ${acc.status === 'ACTIVE' ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'}`}>{acc.status}</span>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">{acc.holderName} · Savings · {show ? acc.accountNumber : acc.maskedNumber}
          <button onClick={() => setShow(!show)} aria-label="Toggle account number">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button></p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['/deposit', 'Deposit', PlusCircle], ['/withdraw', 'Withdraw', MinusCircle], ['/transfer', 'Transfer', Send], ['/history', 'History', History]].map(([to, l, Icon]) => (
          <Link key={to} to={to} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-800 hover:border-teal-400"><Icon size={16} className="text-teal-500" />{l}</Link>))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Net cash flow" value={inr(s.netCashFlow)} tone="navy" />
        <StatCard icon={ArrowDownLeft} label="Total deposits" value={inr(s.totalDeposited)} />
        <StatCard icon={ArrowUpRight} label="Total withdrawals" value={inr(s.totalWithdrawn)} tone="red" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3"><h2 className="mb-3 font-medium text-slate-900">Income vs expenses</h2>
          {chart.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={chart}><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} width={55} />
            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} /><Legend /><Bar dataKey="Income" fill="#14b8a6" radius={[4, 4, 0, 0]} /><Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            : <Empty title="No activity yet" sub="Your monthly chart appears after your first transaction." />}</Card>
        <Card className="lg:col-span-2"><h2 className="mb-3 font-medium text-slate-900">By transaction type</h2>
          {dist.length ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={dist.map((x) => ({ name: TYPE_LABEL[x.type], value: x.count }))} dataKey="value" innerRadius={50} outerRadius={80}>
            {dist.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
            : <Empty title="Nothing to chart" sub="Transaction types will show here." />}</Card>
      </div>
      <Card><div className="mb-2 flex items-center justify-between"><h2 className="font-medium text-slate-900">Recent transactions</h2><Link to="/history" className="text-sm text-teal-600">View all</Link></div><TxList items={tx} /></Card>
    </div>
  );
}
