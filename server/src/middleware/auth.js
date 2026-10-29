import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncH } from '../utils/helpers.js';

export const requireAuth = asyncH(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new ApiError(401, 'Invalid or expired token'); }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');
  req.user = user;
  next();
});
