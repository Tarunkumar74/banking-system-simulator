import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errMsg } from '../services/api';
import { Card, Field, Btn, ConfirmModal, PageTitle, Row, Skeleton } from '../components/ui';
import { inr, validAmount } from '../utils/format';

function MoneyPage({ kind }) {
  const dep = kind === 'deposit';
  const [acc, setAcc] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = useRef(null); // one Idempotency-Key per attempt, so retries and double clicks apply once
  const load = () => api.get('/accounts/me').then((r) => setAcc(r.data.account)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);
  if (!acc) return <Skeleton className="h-64 max-w-xl" />;
  const paise = validAmount(amount) ? Math.round(Number(amount) * 100) : 0;
  const tooMuch = !dep && paise > acc.balance;
  const after = dep ? acc.balance + paise : acc.balance - paise;
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/transactions/${kind}`, { amount, description }, { headers: { 'Idempotency-Key': key.current } });
      toast.success(dep ? 'Deposit successful' : 'Withdrawal successful');
      key.current = null; setAmount(''); setDescription(''); await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setOpen(false); }
  };
  return (
    <div className="max-w-xl">
      <PageTitle title={dep ? 'Deposit money' : 'Withdraw money'} sub={dep ? 'Adds simulated money to your account.' : 'Withdraws simulated money from your account.'} />
      <Card className="space-y-4">
        <Row k={dep ? 'Current balance' : 'Available balance'} v={inr(acc.balance)} />
        <Field label="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); key.current = null; }} placeholder="0.00"
          hint={amount && !validAmount(amount) ? 'Enter a positive amount with up to 2 decimals.' : tooMuch ? 'This is more than your available balance.' : undefined} />
        <div className="flex flex-wrap gap-2">{[500, 1000, 5000, 10000].map((n) => <button key={n} type="button" onClick={() => { setAmount(String(n)); key.current = null; }} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:border-teal-400">₹{n.toLocaleString('en-IN')}</button>)}</div>
        <Field label="Description (optional)" value={description} maxLength={140} onChange={(e) => setDescription(e.target.value)} />
        {paise > 0 && <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm"><Row k="Amount" v={inr(paise)} /><Row k="Balance after" v={inr(after)} /></div>}
        <Btn className="w-full" disabled={!paise || tooMuch} onClick={() => { key.current ||= crypto.randomUUID(); setOpen(true); }}>{dep ? 'Review deposit' : 'Review withdrawal'}</Btn>
      </Card>
      <ConfirmModal open={open} busy={busy} title={dep ? 'Confirm deposit' : 'Confirm withdrawal'} onCancel={() => setOpen(false)} onConfirm={submit}>
        <Row k="Amount" v={inr(paise)} /><Row k="Balance after" v={inr(after)} />
      </ConfirmModal>
    </div>
  );
}
export const Deposit = () => <MoneyPage kind="deposit" />;
export const Withdraw = () => <MoneyPage kind="withdraw" />;
