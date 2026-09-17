const { earnPoints, redeemPoints } = require('../services/rewardService');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');

async function recordPurchase(req, res) {
  return res.json(await earnPoints(req.params.id, req.body.amount));
}

async function redeemMemberPoints(req, res) {
  return res.json(await redeemPoints(req.params.id, req.body.points));
}

async function getMemberTransactions(req, res) {
  const member = await Member.exists({ _id: req.params.id });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const sortField = ['createdAt', 'pointsChange', 'type'].includes(req.query.sortBy)
    ? req.query.sortBy
    : 'createdAt';
  const sortDirection = req.query.order === 'asc' ? 1 : -1;
  const [transactions, total] = await Promise.all([
    Transaction.find({ member: req.params.id })
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments({ member: req.params.id }),
  ]);

  return res.json({
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    sort: { field: sortField, order: sortDirection === 1 ? 'asc' : 'desc' },
  });
}

module.exports = { recordPurchase, redeemMemberPoints, getMemberTransactions };