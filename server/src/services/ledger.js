import mongoose from 'mongoose';
import { randomUUID, randomInt } from 'crypto';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { ApiError } from '../utils/helpers.js';

const ref = () => 'TXN' + Date.now().toString(36).toUpperCase() + randomInt(1000, 9999);
const opts = (s) => (s ? { session: s } : {});

// Runs fn inside a MongoDB transaction; falls back to no session on standalone servers (no replica set).
// In that fallback, balance changes are still single atomic conditional updates, and a failed transfer is compensated manually.
async function runTxn(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await fn(session); });
    return result;
  } catch (e) {
    if (e.code === 20 || /replica set|Transaction numbers/i.test(e.message || '')) return fn(null);
    throw e;
  } finally { session.endSession(); }
}

// Atomic conditional update: the balance check and the change happen in one DB operation.
async function applyBalance(accountId, delta, session) {
  const filter = { _id: accountId, status: 'ACTIVE' };
  if (delta < 0) filter.balance = { $gte: -delta };
  const acc = await Account.findOneAndUpdate(filter, { $inc: { balance: delta } }, { new: true, ...opts(session) });
  if (!acc) throw new ApiError(409, delta < 0 ? 'Insufficient balance or account is not active' : 'Account is not available');
  return acc;
}
const record = async (session, acc, type, amount, delta, extra = {}) =>
  (await Transaction.create([{
    transactionReference: ref(), accountId: acc._id, userId: acc.userId, type, amount,
    balanceBefore: acc.balance - delta, balanceAfter: acc.balance, ...extra,
  }], opts(session)))[0];

const existing = (userId, key) => (key ? Transaction.findOne({ userId, idempotencyKey: key }) : null);
async function idempotent(userId, key, work) {
  const prior = await existing(userId, key);
  if (prior) return prior;
  try { return await runTxn(work); }
  catch (e) { if (e.code === 11000) { const p = await existing(userId, key); if (p) return p; } throw e; }
}

export async function singleEntry(userId, type, amount, description, key) {
  const account = await Account.findOne({ userId });
  if (!account) throw new ApiError(404, 'Account not found');
  const delta = type === 'DEPOSIT' ? amount : -amount;
  return idempotent(userId, key, async (s) => {
    const acc = await applyBalance(account._id, delta, s);
    return record(s, acc, type, amount, delta, { description, idempotencyKey: key });
  });
}

export async function transfer(userId, toNumber, amount, description, key) {
  const from = await Account.findOne({ userId });
  const to = await Account.findOne({ accountNumber: toNumber });
  if (!from) throw new ApiError(404, 'Your account was not found');
  if (!to) throw new ApiError(404, 'Recipient account not found');
  if (String(from._id) === String(to._id)) throw new ApiError(400, 'You cannot transfer to your own account');
  const group = randomUUID();
  return idempotent(userId, key, async (s) => {
    let debited, credited;
    try {
      debited = await applyBalance(from._id, -amount, s);
      credited = await applyBalance(to._id, amount, s);
      const sent = await record(s, debited, 'TRANSFER_SENT', amount, -amount, {
        description, relatedAccountId: to._id, relatedUserId: to.userId, transferGroupId: group, idempotencyKey: key });
      await record(s, credited, 'TRANSFER_RECEIVED', amount, amount, {
        description, relatedAccountId: from._id, relatedUserId: from.userId, transferGroupId: group });
      return sent;
    } catch (e) {
      if (!s) { // no DB transaction available: compensate manually
        if (credited) await Account.updateOne({ _id: to._id }, { $inc: { balance: -amount } });
        if (debited) await Account.updateOne({ _id: from._id }, { $inc: { balance: amount } });
      }
      throw e;
    }
  });
}

export async function createAccountNumber() {
  for (;;) {
    const n = '40' + Array.from({ length: 10 }, () => randomInt(0, 10)).join('');
    if (!(await Account.exists({ accountNumber: n }))) return n;
  }
}
