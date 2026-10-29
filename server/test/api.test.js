// Integration tests: run against MONGODB_URI if set, otherwise an in-memory replica set (supports transactions).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-123';
let server, base, mem, A, B;
const tag = Date.now();

before(async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri || uri.startsWith('your_')) {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = mem.getUri();
  }
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const { default: app } = await import('../src/app.js');
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
  A = await signup('alice'); B = await signup('bobby');
});
after(async () => { server?.close(); await mongoose.disconnect(); await mem?.stop(); });

const call = async (method, path, { token, body, key } = {}) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }), ...(key && { 'Idempotency-Key': key }) }, body: body && JSON.stringify(body) });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, data: type.includes('json') ? await res.json() : await res.text() };
};
const signup = async (name) => {
  const r = await call('POST', '/auth/register', { body: { name, email: `${name}${tag}@test.com`.toLowerCase(), password: 'Passw0rdX' } });
  const acc = await call('GET', '/accounts/me', { token: r.data.token });
  return { token: r.data.token, id: r.data.user.id, acc: acc.data.account, reg: r };
};

test('registration returns token, no password hash, and creates account with welcome credit', () => {
  assert.equal(A.reg.status, 201);
  assert.ok(!JSON.stringify(A.reg.data).includes('passwordHash'));
  assert.equal(A.acc.balance, 1000000);
  assert.match(A.acc.accountNumber, /^\d{12}$/);
});
test('duplicate email and weak password rejected', async () => {
  assert.equal((await call('POST', '/auth/register', { body: { name: 'Alice', email: `alice${tag}@test.com`, password: 'Passw0rdX' } })).status, 409);
  assert.equal((await call('POST', '/auth/register', { body: { name: 'Zed', email: `z${tag}@t.com`, password: 'short' } })).status, 400);
});
test('login works; invalid credentials rejected', async () => {
  assert.equal((await call('POST', '/auth/login', { body: { email: `alice${tag}@test.com`, password: 'Passw0rdX' } })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: `alice${tag}@test.com`, password: 'wrong' } })).status, 401);
});
test('unauthorized access is blocked', async () => {
  for (const p of ['/accounts/me', '/transactions', '/transactions/export', '/analytics/summary']) assert.equal((await call('GET', p)).status, 401, p);
  assert.equal((await call('GET', '/accounts/me', { token: 'bad.token.here' })).status, 401);
});
test('deposit success and invalid amounts', async () => {
  const ok = await call('POST', '/transactions/deposit', { token: A.token, body: { amount: '500.50' } });
  assert.equal(ok.status, 201); assert.equal(ok.data.transaction.amount, 50050);
  for (const amount of ['0', '-5', '1.234', 'abc', '99999999999']) assert.equal((await call('POST', '/transactions/deposit', { token: A.token, body: { amount } })).status, 400, amount);
  assert.equal((await call('GET', '/accounts/me', { token: A.token })).data.account.balance, 1050050);
});
test('withdrawal success and insufficient balance', async () => {
  assert.equal((await call('POST', '/transactions/withdraw', { token: A.token, body: { amount: '50.50' } })).status, 201);
  const bad = await call('POST', '/transactions/withdraw', { token: A.token, body: { amount: '999999' } });
  assert.equal(bad.status, 409);
  assert.equal((await call('GET', '/accounts/me', { token: A.token })).data.account.balance, 1045000);
});
test('transfer success creates linked records; invalid recipient and self-transfer rejected', async () => {
  const t = await call('POST', '/transactions/transfer', { token: A.token, body: { toAccountNumber: B.acc.accountNumber, amount: '100', description: 'rent' } });
  assert.equal(t.status, 201);
  assert.equal((await call('GET', '/accounts/me', { token: A.token })).data.account.balance, 1035000);
  assert.equal((await call('GET', '/accounts/me', { token: B.token })).data.account.balance, 1010000);
  const hist = await call('GET', '/transactions?type=TRANSFER_RECEIVED', { token: B.token });
  assert.equal(hist.data.total, 1);
  assert.equal((await call('POST', '/transactions/transfer', { token: A.token, body: { toAccountNumber: '999999999999', amount: '1' } })).status, 404);
  assert.equal((await call('POST', '/transactions/transfer', { token: A.token, body: { toAccountNumber: A.acc.accountNumber, amount: '1' } })).status, 400);
  assert.equal((await call('POST', '/transactions/transfer', { token: A.token, body: { toAccountNumber: B.acc.accountNumber, amount: '99999' } })).status, 409);
});
test('duplicate submissions with the same Idempotency-Key apply once', async () => {
  const key = 'idem-key-' + tag;
  const before = (await call('GET', '/accounts/me', { token: B.token })).data.account.balance;
  const rs = await Promise.all([1, 2, 3].map(() => call('POST', '/transactions/transfer', { token: B.token, key, body: { toAccountNumber: A.acc.accountNumber, amount: '10' } })));
  assert.ok(rs.every((r) => r.status === 201));
  assert.equal(new Set(rs.map((r) => r.data.transaction.id)).size, 1);
  assert.equal((await call('GET', '/accounts/me', { token: B.token })).data.account.balance, before - 1000);
});
test('concurrent withdrawals never overdraw', async () => {
  const C = await signup('carol'); // balance 1,000,000 paise
  const rs = await Promise.all(Array.from({ length: 8 }, () => call('POST', '/transactions/withdraw', { token: C.token, body: { amount: '3000' } })));
  assert.equal(rs.filter((r) => r.status === 201).length, 3);
  assert.equal((await call('GET', '/accounts/me', { token: C.token })).data.account.balance, 100000);
});
test('concurrent transfers keep total money constant', async () => {
  const D = await signup('dave'), E = await signup('erin');
  await Promise.all(Array.from({ length: 6 }, () => call('POST', '/transactions/transfer', { token: D.token, body: { toAccountNumber: E.acc.accountNumber, amount: '2500' } })));
  const d = (await call('GET', '/accounts/me', { token: D.token })).data.account.balance;
  const e = (await call('GET', '/accounts/me', { token: E.token })).data.account.balance;
  assert.equal(d + e, 2000000); assert.ok(d >= 0);
});
test("cannot read another user's account or transaction", async () => {
  assert.equal((await call('GET', `/accounts/${B.acc.id}`, { token: A.token })).status, 403);
  const mine = await call('GET', '/transactions?limit=1', { token: B.token });
  assert.equal((await call('GET', `/transactions/${mine.data.items[0].id}`, { token: A.token })).status, 404);
});
test('history filtering, search, sort and pagination', async () => {
  const all = await call('GET', '/transactions?limit=2&page=1', { token: A.token });
  assert.equal(all.data.items.length, 2); assert.ok(all.data.pages >= 2);
  assert.equal((await call('GET', '/transactions?q=rent', { token: A.token })).data.total, 1);
  assert.equal((await call('GET', '/transactions?q=.*', { token: A.token })).data.total, 0); // regex chars are escaped
  const oldest = await call('GET', '/transactions?sort=oldest&limit=1', { token: A.token });
  assert.match(oldest.data.items[0].description, /welcome/i);
  assert.equal((await call('GET', '/transactions?type=NOPE', { token: A.token })).status, 400);
  const future = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  assert.equal((await call('GET', `/transactions?from=${future}`, { token: A.token })).data.total, 0);
});
test('CSV export is authorized, scoped and formatted', async () => {
  const csv = await call('GET', '/transactions/export?type=DEPOSIT', { token: A.token });
  assert.equal(csv.status, 200);
  const lines = csv.data.replace('\uFEFF', '').split('\r\n');
  assert.match(lines[0], /^"Reference","Date \(ISO\)"/);
  assert.ok(lines.length >= 3 && lines.slice(1).every((l) => l.includes('"DEPOSIT"')));
  assert.ok(lines.some((l) => l.includes('"500.50"')));
});
test('analytics reflect real records and do not double count transfers', async () => {
  const s = (await call('GET', '/analytics/summary', { token: A.token })).data;
  assert.equal(s.totalDeposited, 1000000 + 50050);
  assert.equal(s.totalWithdrawn, 5050);
  assert.equal(s.transfersSent, 10000);
  assert.equal(s.transfersReceived, 1000);
  assert.equal(s.netCashFlow, 1050050 + 1000 - 5050 - 10000);
  const none = (await signup('frank'), (await call('GET', '/analytics/summary?from=2999-01-01', { token: A.token })).data);
  assert.equal(none.transactionCount, 0); assert.equal(none.mostActivePeriod, null);
});
test('profile: only name editable; password change works', async () => {
  assert.equal((await call('PATCH', '/users/me', { token: A.token, body: { name: 'Alice Z', role: 'admin' } })).status, 400);
  const ok = await call('PATCH', '/users/me', { token: A.token, body: { name: 'Alice Z' } });
  assert.equal(ok.data.user.name, 'Alice Z'); assert.equal(ok.data.user.role, 'user');
  assert.equal((await call('POST', '/auth/change-password', { token: A.token, body: { currentPassword: 'nope', newPassword: 'NewPassw0rd' } })).status, 400);
  assert.equal((await call('POST', '/auth/change-password', { token: A.token, body: { currentPassword: 'Passw0rdX', newPassword: 'NewPassw0rd' } })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: `alice${tag}@test.com`, password: 'NewPassw0rd' } })).status, 200);
});
