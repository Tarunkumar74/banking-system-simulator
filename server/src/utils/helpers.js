export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Money is stored as integer paise. Rupee strings are parsed without floating point.
export function toPaise(v) {
  const s = String(v ?? '').trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) throw new ApiError(400, 'Enter a valid amount with at most 2 decimals');
  const [r, p = ''] = s.split('.');
  const n = Number(r) * 100 + Number(p.padEnd(2, '0'));
  if (n <= 0) throw new ApiError(400, 'Amount must be greater than zero');
  if (n > 100000000) throw new ApiError(400, 'Maximum per transaction is ₹10,00,000');
  return n;
}
export const maskAccount = (n) => 'XXXXXX' + String(n).slice(-4);
export const CREDIT_TYPES = ['DEPOSIT', 'TRANSFER_RECEIVED'];
export const TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_SENT', 'TRANSFER_RECEIVED'];

export const txDTO = (t) => ({
  id: t._id, reference: t.transactionReference, type: t.type, amount: t.amount,
  direction: CREDIT_TYPES.includes(t.type) ? 'CREDIT' : 'DEBIT',
  balanceAfter: t.balanceAfter, description: t.description, status: t.status,
  relatedAccount: t.relatedAccountId?.accountNumber ? maskAccount(t.relatedAccountId.accountNumber) : null,
  createdAt: t.createdAt,
});
export const accountDTO = (a, name) => ({
  id: a._id, holderName: name, accountNumber: a.accountNumber, maskedNumber: maskAccount(a.accountNumber),
  accountType: a.accountType, balance: a.balance, currency: a.currency, status: a.status, createdAt: a.createdAt,
});
