import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  transactionReference: { type: String, required: true, unique: true },
  accountId: { type: ObjectId, ref: 'Account', required: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_SENT', 'TRANSFER_RECEIVED'], required: true },
  amount: { type: Number, required: true, min: 1 }, // integer paise
  balanceBefore: Number,
  balanceAfter: Number,
  description: { type: String, trim: true, maxlength: 140, default: '' },
  relatedAccountId: { type: ObjectId, ref: 'Account' },
  relatedUserId: { type: ObjectId, ref: 'User' },
  transferGroupId: String,
  status: { type: String, enum: ['COMPLETED', 'FAILED'], default: 'COMPLETED' },
  idempotencyKey: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
export default mongoose.model('Transaction', schema);
