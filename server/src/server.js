import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16 || process.env.JWT_SECRET.startsWith('replace_')) {
  console.error('JWT_SECRET is missing or too short. Set a long random value in server/.env');
  process.exit(1);
}
connectDB().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}).catch((e) => { console.error(e.message); process.exit(1); });
