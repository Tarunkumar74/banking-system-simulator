import { Router } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncH } from '../utils/helpers.js';

// Each user only holds their own side of a transfer (TRANSFER_SENT or TRANSFER_RECEIVED), so a transfer is
// never double-counted. Money in = deposits + transfers received; money out = withdrawals + transfers sent.
const r = Router();
r.use(requireAuth);

function match(req) {
  const m = { userId: new mongoose.Types.ObjectId(req.user._id), status: 'COMPLETED' };
  const range = {};
  for (const k of ['from', 'to']) {
    if (!req.query[k]) continue;
    const d = new Date(req.query[k]);
    if (isNaN(d)) throw new ApiError(400, `Invalid ${k} date`);
    if (k === 'to') d.setUTCHours(23, 59, 59, 999);
    range[k === 'from' ? '$gte' : '$lte'] = d;
  }
  if (Object.keys(range).length) m.createdAt = range;
  return m;
}
const monthly = (m, fmt) => Transaction.aggregate([
  { $match: m },
  { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } },
    deposits: { $sum: { $cond: [{ $eq: ['$type', 'DEPOSIT'] }, '$amount', 0] } },
    withdrawals: { $sum: { $cond: [{ $eq: ['$type', 'WITHDRAWAL'] }, '$amount', 0] } },
    income: { $sum: { $cond: [{ $in: ['$type', ['DEPOSIT', 'TRANSFER_RECEIVED']] }, '$amount', 0] } },
    expense: { $sum: { $cond: [{ $in: ['$type', ['WITHDRAWAL', 'TRANSFER_SENT']] }, '$amount', 0] } },
    count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);

r.get('/summary', asyncH(async (req, res) => {
  const m = match(req);
  const [byType, months] = await Promise.all([
    Transaction.aggregate([{ $match: m }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    monthly(m, '%Y-%m'),
  ]);
  const t = Object.fromEntries(byType.map((x) => [x._id, x]));
  const sum = (k) => t[k]?.total || 0;
  const busiest = [...months].sort((a, b) => b.count - a.count)[0];
  res.json({
    totalDeposited: sum('DEPOSIT'), totalWithdrawn: sum('WITHDRAWAL'),
    transfersSent: sum('TRANSFER_SENT'), transfersReceived: sum('TRANSFER_RECEIVED'),
    netCashFlow: sum('DEPOSIT') + sum('TRANSFER_RECEIVED') - sum('WITHDRAWAL') - sum('TRANSFER_SENT'),
    transactionCount: byType.reduce((n, x) => n + x.count, 0),
    mostActivePeriod: busiest ? { period: busiest._id, count: busiest.count } : null,
  });
}));
r.get('/monthly', asyncH(async (req, res) => {
  const rows = await monthly(match(req), req.query.group === 'year' ? '%Y' : '%Y-%m');
  res.json({ items: rows.map(({ _id, ...x }) => ({ period: _id, ...x })) });
}));
r.get('/distribution', asyncH(async (req, res) => {
  const rows = await Transaction.aggregate([{ $match: match(req) },
    { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }, { $sort: { count: -1 } }]);
  res.json({ items: rows.map(({ _id, ...x }) => ({ type: _id, ...x })) });
}));
export default r;
