const Notification = require('../models/Notification');
const { expireStalePoints, RewardError } = require('../services/rewardService');

async function runClock(req, res) {
  const requestedTime = req.body && req.body.now ? req.body.now : new Date();
  if (Number.isNaN(new Date(requestedTime).getTime())) throw new RewardError('Invalid clock time', 400);
  return res.json(await expireStalePoints(requestedTime));
}

async function getOutbox(req, res) {
  const notifications = await Notification.find().sort({ createdAt: 1 });
  return res.json({ notifications });
}

module.exports = { runClock, getOutbox };