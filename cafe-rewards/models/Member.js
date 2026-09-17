const mongoose = require('mongoose');

const TIERS = ['Regular', 'Silver', 'Gold', 'Platinum'];

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1 },
    phone: { type: String, required: true, unique: true, trim: true },
    tier: { type: String, enum: TIERS, default: 'Regular', required: true },
    points: { type: Number, min: 0, default: 0, required: true },
    lifetimeSpend: { type: Number, min: 0, default: 0, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
module.exports.TIERS = TIERS;