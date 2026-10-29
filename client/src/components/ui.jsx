import { Component } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { inr, dt, TYPE_LABEL } from '../utils/format';

export const Card = ({ className = '', children }) => <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
export const PageTitle = ({ title, sub }) => <div className="mb-6"><h1 className="text-2xl font-semibold text-slate-900">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>;

const tones = { teal: 'bg-teal-50 text-teal-600', red: 'bg-rose-50 text-rose-600', navy: 'bg-navy text-cyan-300', blue: 'bg-sky-50 text-sky-600' };
export const StatCard = ({ icon: Icon, label, value, tone = 'teal' }) => (
  <Card className="flex items-center gap-4">
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={20} /></div>
    <div className="min-w-0"><p className="text-sm text-slate-500">{label}</p><p className="truncate text-xl font-semibold text-slate-900">{value}</p></div>
  </Card>
);
export const Field = ({ label, hint, ...p }) => (
  <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span>
    <input {...p} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200" />
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>
);
export const Btn = ({ variant = 'primary', className = '', ...p }) => {
  const v = { primary: 'bg-teal-500 text-white hover:bg-teal-600', dark: 'bg-navy text-white hover:bg-navy-2', ghost: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', danger: 'bg-rose-500 text-white hover:bg-rose-600' }[variant];
  return <button {...p} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
};
export function ConfirmModal({ open, title, children, onConfirm, onCancel, busy, confirmText = 'Confirm' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Btn variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Btn>
          <Btn onClick={onConfirm} disabled={busy}>{busy ? 'Processing…' : confirmText}</Btn>
        </div>
      </div>
    </div>
  );
}
export const Row = ({ k, v }) => <div className="flex justify-between gap-4"><span className="text-slate-500">{k}</span><span className="font-medium text-slate-900">{v}</span></div>;
export const Empty = ({ title, sub }) => <div className="py-10 text-center"><p className="font-medium text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{sub}</p></div>;

export function TxList({ items }) {
  if (!items.length) return <Empty title="No transactions yet" sub="Make a deposit to see activity here." />;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((t) => {
        const credit = t.direction === 'CREDIT';
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${credit ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
              {credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{TYPE_LABEL[t.type]}{t.relatedAccount ? ` · ${t.relatedAccount}` : ''}</p>
              <p className="truncate text-xs text-slate-500">{t.description || '—'} • {dt(t.createdAt)} • {t.reference}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${credit ? 'text-teal-600' : 'text-rose-600'}`}>{credit ? '+' : '−'}{inr(t.amount)}</p>
              <p className="text-xs text-slate-400">{t.status}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
export class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return <div className="grid min-h-screen place-items-center p-6"><Card className="max-w-md text-center"><h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">Reload the page. If it keeps happening, check the browser console.</p>
      <Btn className="mt-4" onClick={() => location.reload()}>Reload</Btn></Card></div>;
  }
}
