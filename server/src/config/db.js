import mongoose from 'mongoose';
export async function connectDB() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.startsWith('your_')) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
}
