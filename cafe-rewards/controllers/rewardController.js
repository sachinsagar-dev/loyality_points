const { earnPoints, redeemPoints } = require('../services/rewardService');

async function recordPurchase(req, res) {
  return res.json(await earnPoints(req.params.id, req.body.amount));
}

async function redeemMemberPoints(req, res) {
  return res.json(await redeemPoints(req.params.id, req.body.points));
}

module.exports = { recordPurchase, redeemMemberPoints };