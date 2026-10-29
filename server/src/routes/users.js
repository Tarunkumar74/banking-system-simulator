import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncH } from '../utils/helpers.js';
import { userDTO } from './auth.js';

const r = Router();
r.use(requireAuth);
r.get('/me', (req, res) => res.json({ user: userDTO(req.user) }));
// Only the name is editable: role and email cannot be changed here (.strict() rejects extra fields).
r.patch('/me', asyncH(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60) }).strict().parse(req.body);
  req.user.name = name;
  await req.user.save();
  res.json({ user: userDTO(req.user) });
}));
export default r;
