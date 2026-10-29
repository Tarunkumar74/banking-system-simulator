import { Router } from 'express';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncH, accountDTO, maskAccount } from '../utils/helpers.js';

const r = Router();
r.use(requireAuth);

r.get('/me', asyncH(async (req, res) => {
  const a = await Account.findOne({ userId: req.user._id });
  if (!a) throw new ApiError(404, 'Account not found');
  res.json({ account: accountDTO(a, req.user.name) });
}));

r.get('/verify/:accountNumber', asyncH(async (req, res) => {
  if (!/^\d{12}$/.test(req.params.accountNumber)) throw new ApiError(400, 'Account number must be 12 digits');
  const a = await Account.findOne({ accountNumber: req.params.accountNumber });
  if (!a || a.status !== 'ACTIVE') throw new ApiError(404, 'No active account found with this number');
  if (String(a.userId) === String(req.user._id)) throw new ApiError(400, 'This is your own account');
  const owner = await User.findById(a.userId);
  res.json({ holderName: owner.name, maskedNumber: maskAccount(a.accountNumber) });
}));

r.get('/:id', asyncH(async (req, res) => {
  const a = await Account.findById(req.params.id);
  if (!a || String(a.userId) !== String(req.user._id)) throw new ApiError(403, 'You can only view your own account');
  res.json({ account: accountDTO(a, req.user.name) });
}));
export default r;
