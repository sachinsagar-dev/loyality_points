const mongoose = require('mongoose');

const pointLotSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    pointsRemaining: { type: Number, min: 0, required: true },
    earnedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

pointLotSchema.index({ member: 1, expiresAt: 1 });

module.exports = mongoose.model('PointLot', pointLotSchema);