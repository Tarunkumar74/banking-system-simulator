# Banking System Simulator

A full-stack educational web app that simulates basic banking with **demo money**: accounts, deposits, withdrawals, transfers between accounts, transaction history with CSV export, and analytics.
**This is not a real bank.** No real money, payment rails or banking credentials are involved.

**Stack:** React 18 + Vite + Tailwind CSS 4 + Recharts + Lucide + React Hot Toast · Node.js + Express · MongoDB (Atlas) + Mongoose · JWT + bcrypt · Zod validation · Helmet, CORS, rate limiting.

## Problem statement and objectives
Show how a bank ledger keeps balances correct under retries and concurrency. Objectives: secure auth; integer-money ledger; atomic balance updates; idempotent transfers; real analytics from real records; a polished, responsive UI.

## Features
- Register / login / logout, JWT sessions, change password, protected routes
- Auto-created Savings account with unique 12-digit number (masked in UI, reveal toggle)
- Deposit, withdraw, transfer (recipient name verified before confirming), each with a confirmation dialog
- History: search, type filter, date range, sort, pagination, **CSV export** (all or filtered)
- Analytics: monthly/yearly deposits vs withdrawals, totals, net cash flow, activity, type distribution, most active month
- Light/dark theme, loading skeletons, empty states, error boundary, custom 404

## Design decisions (money and consistency)
- **Money is stored as integer paise.** Amount strings are parsed without floating point; max ₹10,00,000 per transaction.
- **Initial balance policy:** each new account gets a ₹10,000 demo welcome credit, recorded as a real DEPOSIT transaction so ledger and balance always reconcile.
- **Atomic balance change:** `findOneAndUpdate({balance: {$gte: amount}}, {$inc})` checks and changes in one operation, so concurrent withdrawals cannot overdraw.
- **MongoDB transactions** wrap balance updates and ledger records (Atlas supports them). On a standalone MongoDB without transactions the app falls back to atomic single updates plus a compensating rollback if a transfer fails midway. Limitation: a process crash in that narrow window could leave a transfer half-applied.
- **Idempotency:** the client sends an `Idempotency-Key` header (one per attempt). A unique partial index on `(userId, idempotencyKey)` makes retries and double-clicks apply once.
- **Analytics definition:** money in = deposits + transfers received; money out = withdrawals + transfers sent. Each user holds only their own side of a transfer, so nothing is counted twice.
- CSV cells starting with `= + - @` are prefixed with `'` to prevent spreadsheet formula injection.

## Database schema
- **User**: name, email (unique, lowercase), passwordHash (never returned), role, timestamps
- **Account**: userId (unique), accountNumber (unique), accountType, balance (int paise, ≥ 0), currency, status
- **Transaction**: transactionReference (unique), accountId, userId, type, amount, balanceBefore, balanceAfter, description, relatedAccountId, relatedUserId, transferGroupId, status, idempotencyKey, createdAt. Indexes: `(userId, createdAt)`, unique partial `(userId, idempotencyKey)`.

## API (all except register/login need `Authorization: Bearer <token>`)
| Method | Path | Notes |
|---|---|---|
| POST | /api/auth/register, /login | rate limited |
| GET | /api/auth/me | |
| POST | /api/auth/logout, /change-password | |
| GET | /api/accounts/me, /accounts/:id, /accounts/verify/:accountNumber | `:id` only for your own account |
| POST | /api/transactions/deposit, /withdraw, /transfer | optional `Idempotency-Key` header |
| GET | /api/transactions | `page, limit, type, from, to, q, sort=newest\|oldest` |
| GET | /api/transactions/export | same filters, returns CSV |
| GET | /api/transactions/:id | |
| GET | /api/analytics/summary, /monthly (`group=month\|year`), /distribution | `from, to` filters |
| GET, PATCH | /api/users/me | PATCH accepts `name` only |

## Setup (Windows PowerShell)
**1. MongoDB Atlas:** create a free cluster at cloud.mongodb.com → Database Access: add a user → Network Access: allow your IP → Connect → Drivers → copy the connection string (add a database name, e.g. `.../banking_sim`).

**2. Backend** (run inside `banking-system-simulator\server`):
```powershell
cd server
npm install
Copy-Item .env.example .env
# edit .env: set MONGODB_URI and a long random JWT_SECRET, e.g. generate one with:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run dev
```
**3. Frontend** (new terminal, inside `banking-system-simulator\client`):
```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev
```
Open http://localhost:5173.

## Demo workflow
1. Register two users (use a private window for the second). Each starts with ₹10,000.
2. User A: Account page → copy the account number.
3. User B: Transfer → paste number → Verify → amount → Review → Confirm.
4. Check Dashboard, History (try filters, export CSV) and Analytics for both users.
5. Toggle dark mode from the sidebar or Profile.

## Testing
Integration tests (15) cover registration/login, invalid credentials, unauthorized access, deposits, withdrawals, transfers, same-account and unknown recipients, idempotency, concurrent withdrawals and transfers, cross-user access, filtering/pagination, CSV export, analytics accuracy and profile rules.
```powershell
cd server
npm test    # uses an in-memory MongoDB replica set (downloads a MongoDB binary on first run)
$env:MONGODB_URI="<a test database URI>"; npm test    # or run against your own database
```
Run tests against a throwaway database, never your real data.

## Limitations and future work
- Educational demo: no KYC, no real payments, JWT stored in localStorage (an httpOnly-cookie design is safer for production), no refresh tokens or token revocation on logout.
- Admin dashboard (optional extension) is not implemented; the `role` field exists for it.
- Screenshots: _add after running the app_ (`docs/dashboard.png`, `docs/transfer.png`, `docs/analytics.png`).
