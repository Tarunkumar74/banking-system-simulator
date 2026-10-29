import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, ArrowDownLeft, ArrowUpRight, Hash } from 'lucide-react';
import { api, errMsg } from '../services/api';
import { Card, StatCard, PageTitle, Empty, Skeleton } from '../components/ui';
import { inr, TYPE_LABEL } from '../utils/format';
import { COLORS } from './Dashboard';

const sel = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800';
export default function Analytics() {
  const [f, setF] = useState({ from: '', to: '', group: 'month' });
  const [d, setD] = useState(null);
  useEffect(() => {
    const p = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    Promise.all([api.get('/analytics/summary', { params: p }), api.get('/analytics/monthly', { params: p }), api.get('/analytics/distribution', { params: p })])
      .then(([s, m, dist]) => setD({ s: s.data, m: m.data.items, dist: dist.data.items })).catch((e) => toast.error(errMsg(e)));
  }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const tip = (v) => `₹${v.toLocaleString('en-IN')}`;
  const unit = f.group === 'year' ? 'year' : 'month';
  return (
    <div className="space-y-6">
      <PageTitle title="Analytics" sub="Money in = deposits + transfers received. Money out = withdrawals + transfers sent. Each transfer counts once for you." />
      <Card className="flex flex-wrap gap-2">
        <input type="date" className={sel} value={f.from} onChange={set('from')} aria-label="From date" />
        <input type="date" className={sel} value={f.to} onChange={set('to')} aria-label="To date" />
        <select className={sel} value={f.group} onChange={set('group')} aria-label="Grouping"><option value="month">Monthly view</option><option value="year">Yearly view</option></select>
      </Card>
      {!d ? <Skeleton className="h-64" /> : d.s.transactionCount === 0 ? <Card><Empty title="No transactions in this range" sub="Make a deposit or widen the date filter to see analytics." /></Card> : (<>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ArrowDownLeft} label="Total deposited" value={inr(d.s.totalDeposited)} />
          <StatCard icon={ArrowUpRight} label="Total withdrawn" value={inr(d.s.totalWithdrawn)} tone="red" />
          <StatCard icon={Wallet} label="Net cash flow" value={inr(d.s.netCashFlow)} tone="navy" />
          <StatCard icon={Hash} label="Transactions" value={d.s.transactionCount} tone="blue" />
        </div>
        {d.s.mostActivePeriod && <p className="text-sm text-slate-600">Most active month: <b>{d.s.mostActivePeriod.period}</b> ({d.s.mostActivePeriod.count} transactions)</p>}
        <Card><h2 className="mb-3 font-medium text-slate-900">Deposits vs withdrawals by {unit}</h2>
          <ResponsiveContainer width="100%" height={260}><BarChart data={d.m.map((x) => ({ period: x.period, Deposits: x.deposits / 100, Withdrawals: x.withdrawals / 100 }))}>
            <XAxis dataKey="period" fontSize={12} /><YAxis fontSize={12} width={60} /><Tooltip formatter={tip} /><Legend />
            <Bar dataKey="Deposits" fill="#14b8a6" radius={[4, 4, 0, 0]} /><Bar dataKey="Withdrawals" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h2 className="mb-3 font-medium text-slate-900">Transaction activity</h2>
            <ResponsiveContainer width="100%" height={240}><LineChart data={d.m}><XAxis dataKey="period" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} width={30} /><Tooltip />
              <Line dataKey="count" name="Transactions" stroke="#0ea5e9" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>
          <Card><h2 className="mb-3 font-medium text-slate-900">Type distribution</h2>
            <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={d.dist.map((x) => ({ name: TYPE_LABEL[x.type], value: x.count }))} dataKey="value" outerRadius={85} label>
              {d.dist.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Card>
        </div></>)}
    </div>
  );
}
