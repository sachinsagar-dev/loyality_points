const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    type: { type: String, enum: ['purchase', 'redemption', 'expiration'], required: true },
    purchaseAmount: { type: Number, min: 0 },
    pointsChange: { type: Number, required: true },
    balanceAfter: { type: Number, min: 0, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ member: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);