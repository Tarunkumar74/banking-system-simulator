import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { api, errMsg } from '../services/api';
import { Card, PageTitle, TxList, Btn, Skeleton } from '../components/ui';
import { TYPE_LABEL } from '../utils/format';

const sel = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800';
export default function History() {
  const [f, setF] = useState({ q: '', type: '', from: '', to: '', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => { setQ(f.q); setPage(1); }, 350); return () => clearTimeout(t); }, [f.q]);
  const params = useMemo(() => Object.fromEntries(Object.entries({ type: f.type, from: f.from, to: f.to, sort: f.sort, q }).filter(([k, v]) => v && !(k === 'sort' && v === 'newest'))), [f.type, f.from, f.to, f.sort, q]);
  useEffect(() => {
    api.get('/transactions', { params: { ...params, page, limit: 10 } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [params, page]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const exportCsv = async (filtered) => {
    try {
      const r = await api.get('/transactions/export', { params: filtered ? params : {}, responseType: 'blob' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(r.data), download: filtered ? 'transactions-filtered.csv' : 'transactions-all.csv' });
      a.click(); URL.revokeObjectURL(a.href);
    } catch { toast.error('Export failed. Please try again.'); }
  };
  const filtered = Object.keys(params).length > 0;
  return (
    <div className="space-y-4">
      <PageTitle title="Transaction history" />
      <Card className="flex flex-wrap items-center gap-2">
        <input className={`${sel} min-w-40 flex-1`} placeholder="Search description or reference" value={f.q} onChange={set('q')} aria-label="Search" />
        <select className={sel} value={f.type} onChange={set('type')} aria-label="Type"><option value="">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="date" className={sel} value={f.from} onChange={set('from')} aria-label="From date" />
        <input type="date" className={sel} value={f.to} onChange={set('to')} aria-label="To date" />
        <select className={sel} value={f.sort} onChange={set('sort')} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" onClick={() => exportCsv(true)}><Download size={14} className="mr-1 inline" />Export filtered CSV</Btn>
        <Btn variant="ghost" onClick={() => exportCsv(false)}><Download size={14} className="mr-1 inline" />Export all CSV</Btn>
      </div>
      <Card>{!data ? <Skeleton className="h-48" /> : (data.items.length || !filtered ? <TxList items={data.items} />
        : <p className="py-10 text-center text-sm text-slate-500">No transactions match these filters. Clear a filter to see more.</p>)}</Card>
      {data && <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{data.total} transactions · page {data.page} of {data.pages}</span>
        <div className="flex gap-2"><Btn variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn><Btn variant="ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Btn></div></div>}
    </div>
  );
}
