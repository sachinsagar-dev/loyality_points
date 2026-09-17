const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    type: { type: String, enum: ['tier_upgraded'], required: true },
    eventKey: { type: String, required: true, unique: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);