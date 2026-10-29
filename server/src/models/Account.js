import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  accountNumber: { type: String, required: true, unique: true },
  accountType: { type: String, enum: ['SAVINGS'], default: 'SAVINGS' },
  balance: { type: Number, default: 0, min: 0, validate: Number.isInteger }, // integer paise
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
}, { timestamps: true });
export default mongoose.model('Account', schema);
