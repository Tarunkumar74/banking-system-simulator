import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { api, errMsg } from '../services/api';
import { Card, PageTitle, Row, Skeleton, Btn } from '../components/ui';
import { inr, dt } from '../utils/format';

export default function AccountPage() {
  const [acc, setAcc] = useState(null);
  const [show, setShow] = useState(false);
  useEffect(() => { api.get('/accounts/me').then((r) => setAcc(r.data.account)).catch((e) => toast.error(errMsg(e))); }, []);
  if (!acc) return <Skeleton className="h-64 max-w-xl" />;
  const copy = async () => { try { await navigator.clipboard.writeText(acc.accountNumber); toast.success('Account number copied'); } catch { toast.error('Copy failed'); } };
  return (
    <div className="max-w-xl space-y-4">
      <PageTitle title="Account details" sub="Share your account number so others can send you demo money." />
      <Card className="space-y-3 text-sm">
        <Row k="Account holder" v={acc.holderName} />
        <Row k="Account number" v={show ? acc.accountNumber : acc.maskedNumber} />
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setShow(!show)}>{show ? <EyeOff size={14} className="mr-1 inline" /> : <Eye size={14} className="mr-1 inline" />}{show ? 'Hide number' : 'Show number'}</Btn>
          <Btn variant="ghost" onClick={copy}><Copy size={14} className="mr-1 inline" />Copy number</Btn>
        </div>
        <Row k="Account type" v={acc.accountType === 'SAVINGS' ? 'Savings' : acc.accountType} />
        <Row k="Balance" v={inr(acc.balance)} />
        <Row k="Currency" v={acc.currency} />
        <Row k="Status" v={acc.status} />
        <Row k="Opened" v={dt(acc.createdAt)} />
      </Card>
    </div>
  );
}
