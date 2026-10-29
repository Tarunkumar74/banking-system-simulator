import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import { api, errMsg } from '../services/api';
import { Card, Field, Btn, ConfirmModal, PageTitle, Row, Skeleton } from '../components/ui';
import { inr, validAmount } from '../utils/format';

export default function Transfer() {
  const [acc, setAcc] = useState(null);
  const [to, setTo] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const key = useRef(null);
  const load = () => api.get('/accounts/me').then((r) => setAcc(r.data.account));
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, []);
  if (!acc) return <Skeleton className="h-64 max-w-xl" />;
  const paise = validAmount(amount) ? Math.round(Number(amount) * 100) : 0;
  const verify = async () => {
    setRecipient(null);
    try { setRecipient((await api.get(`/accounts/verify/${to}`)).data); } catch (e) { toast.error(errMsg(e)); }
  };
  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/transactions/transfer', { toAccountNumber: to, amount, description }, { headers: { 'Idempotency-Key': key.current } });
      setDone({ ...data.transaction, name: recipient.holderName }); key.current = null;
      setTo(''); setRecipient(null); setAmount(''); setDescription(''); await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setOpen(false); }
  };
  return (
    <div className="max-w-xl space-y-4">
      <PageTitle title="Transfer money" sub="Send simulated money to another demo account." />
      {done && <Card className="flex items-start gap-3 border-teal-300 bg-teal-50"><CheckCircle2 className="text-teal-600" />
        <div className="text-sm"><p className="font-medium text-slate-900">Transfer completed</p><p className="text-slate-600">{inr(done.amount)} sent to {done.name}. Reference {done.reference}. Status: {done.status}.</p></div></Card>}
      <Card className="space-y-4">
        <Row k="Available balance" v={inr(acc.balance)} />
        <div className="flex items-end gap-2"><div className="flex-1"><Field label="Recipient account number" inputMode="numeric" maxLength={12} value={to}
          onChange={(e) => { setTo(e.target.value.replace(/\D/g, '')); setRecipient(null); key.current = null; }} /></div>
          <Btn variant="ghost" disabled={to.length !== 12} onClick={verify}>Verify</Btn></div>
        {recipient && <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">Recipient: <b>{recipient.holderName}</b> ({recipient.maskedNumber})</p>}
        <Field label="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); key.current = null; }}
          hint={paise > acc.balance ? 'This is more than your available balance.' : undefined} />
        <Field label="Note (optional)" maxLength={140} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Btn className="w-full" disabled={!recipient || !paise || paise > acc.balance} onClick={() => { key.current ||= crypto.randomUUID(); setDone(null); setOpen(true); }}>Review transfer</Btn>
      </Card>
      <ConfirmModal open={open} busy={busy} title="Confirm transfer" onCancel={() => setOpen(false)} onConfirm={submit}>
        <Row k="To" v={recipient?.holderName} /><Row k="Account" v={recipient?.maskedNumber} /><Row k="Amount" v={inr(paise)} /><Row k="Balance after" v={inr(acc.balance - paise)} />
      </ConfirmModal>
    </div>
  );
}
