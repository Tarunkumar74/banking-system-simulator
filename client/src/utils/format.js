const nf = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
export const inr = (paise) => nf.format((paise || 0) / 100);
export const dt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export const TYPE_LABEL = { DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal', TRANSFER_SENT: 'Transfer sent', TRANSFER_RECEIVED: 'Transfer received' };
export const validAmount = (s) => /^\d+(\.\d{1,2})?$/.test(s) && Number(s) > 0;
