import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncH } from '../utils/helpers.js';
import { createAccountNumber, singleEntry } from '../services/ledger.js';

export const INITIAL_BALANCE_PAISE = 1000000; // ₹10,000 demo welcome credit, recorded as a real deposit
const password = z.string().min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password needs a letter').regex(/\d/, 'Password needs a number').max(72);
const email = z.string().trim().toLowerCase().email('Enter a valid email');
const sign = (u) => jwt.sign({ sub: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
export const userDTO = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });

const r = Router();

r.post('/register', asyncH(async (req, res) => {
  const { name, email: mail, password: pw } = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60), email, password,
  }).parse(req.body);
  if (await User.exists({ email: mail })) throw new ApiError(409, 'An account with this email already exists');
  const user = await User.create({ name, email: mail, passwordHash: await bcrypt.hash(pw, 12) });
  try {
    await Account.create({ userId: user._id, accountNumber: await createAccountNumber() });
    await singleEntry(user._id, 'DEPOSIT', INITIAL_BALANCE_PAISE, 'Demo welcome credit (simulated money)', `welcome-${user._id}`);
  } catch (e) { await Account.deleteOne({ userId: user._id }); await User.deleteOne({ _id: user._id }); throw e; }
  res.status(201).json({ token: sign(user), user: userDTO(user) });
}));

r.post('/login', asyncH(async (req, res) => {
  const { email: mail, password: pw } = z.object({ email, password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: mail }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(pw, user.passwordHash))) throw new ApiError(401, 'Invalid email or password');
  res.json({ token: sign(user), user: userDTO(user) });
}));

r.get('/me', requireAuth, (req, res) => res.json({ user: userDTO(req.user) }));
r.post('/logout', requireAuth, (req, res) => res.json({ message: 'Logged out' })); // JWT is stateless: client discards the token

r.post('/change-password', requireAuth, asyncH(async (req, res) => {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new ApiError(400, 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Password updated' });
}));
export default r;
