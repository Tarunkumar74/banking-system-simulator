import { Router } from 'express';
import { z } from 'zod';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncH, toPaise, txDTO, TYPES } from '../utils/helpers.js';
import { singleEntry, transfer } from '../services/ledger.js';

const r = Router();
r.use(requireAuth);

const amountField = z.union([z.string(), z.number()]);
const desc = z.string().trim().max(140, 'Description is too long').optional().default('');
const keyOf = (req) => {
  const k = req.get('Idempotency-Key');
  if (k && !/^[\w-]{8,64}$/.test(k)) throw new ApiError(400, 'Invalid Idempotency-Key');
  return k || undefined;
};
const populate = { path: 'relatedAccountId', select: 'accountNumber' };

r.post('/deposit', asyncH(async (req, res) => {
  const b = z.object({ amount: amountField, description: desc }).parse(req.body);
  const t = await singleEntry(req.user._id, 'DEPOSIT', toPaise(b.amount), b.description || 'Deposit', keyOf(req));
  res.status(201).json({ transaction: txDTO(t) });
}));
r.post('/withdraw', asyncH(async (req, res) => {
  const b = z.object({ amount: amountField, description: desc }).parse(req.body);
  const t = await singleEntry(req.user._id, 'WITHDRAWAL', toPaise(b.amount), b.description || 'Withdrawal', keyOf(req));
  res.status(201).json({ transaction: txDTO(t) });
}));
r.post('/transfer', asyncH(async (req, res) => {
  const b = z.object({ toAccountNumber: z.string().regex(/^\d{12}$/, 'Account number must be 12 digits'),
    amount: amountField, description: desc }).parse(req.body);
  const t = await transfer(req.user._id, b.toAccountNumber, toPaise(b.amount), b.description || 'Transfer', keyOf(req));
  res.status(201).json({ transaction: txDTO(t) });
}));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildFilter(userId, q) {
  const f = { userId };
  if (q.type) { if (!TYPES.includes(q.type)) throw new ApiError(400, 'Invalid type'); f.type = q.type; }
  const range = {};
  for (const k of ['from', 'to']) {
    if (!q[k]) continue;
    const d = new Date(q[k]);
    if (isNaN(d)) throw new ApiError(400, `Invalid ${k} date`);
    if (k === 'to') d.setUTCHours(23, 59, 59, 999);
    range[k === 'from' ? '$gte' : '$lte'] = d;
  }
  if (Object.keys(range).length) f.createdAt = range;
  if (q.q) { const rx = new RegExp(esc(String(q.q).slice(0, 60)), 'i'); f.$or = [{ description: rx }, { transactionReference: rx }]; }
  return f;
}
const sortOf = (q) => ({ createdAt: q.sort === 'oldest' ? 1 : -1 });

r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const f = buildFilter(req.user._id, req.query);
  const [items, total] = await Promise.all([
    Transaction.find(f).sort(sortOf(req.query)).skip((page - 1) * limit).limit(limit).populate(populate),
    Transaction.countDocuments(f),
  ]);
  res.json({ items: items.map(txDTO), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
}));

// CSV cells starting with = + - @ are prefixed with ' to block spreadsheet formula injection.
const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
r.get('/export', asyncH(async (req, res) => {
  const items = await Transaction.find(buildFilter(req.user._id, req.query)).sort(sortOf(req.query)).limit(10000).populate(populate);
  const head = ['Reference', 'Date (ISO)', 'Type', 'Direction', 'Amount (INR)', 'Balance After (INR)', 'Description', 'Related Account', 'Status'];
  const rows = items.map(txDTO).map((t) => [t.reference, new Date(t.createdAt).toISOString(), t.type, t.direction,
    (t.amount / 100).toFixed(2), (t.balanceAfter / 100).toFixed(2), t.description, t.relatedAccount || '', t.status]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send('\uFEFF' + [head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n'));
}));

r.get('/:id', asyncH(async (req, res) => {
  const t = await Transaction.findOne({ _id: req.params.id, userId: req.user._id }).populate(populate);
  if (!t) throw new ApiError(404, 'Transaction not found');
  res.json({ transaction: txDTO(t) });
}));
export default r;
