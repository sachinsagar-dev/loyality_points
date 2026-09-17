const Member = require('../models/Member');
const { REWARD_RULES } = require('../services/rewardService');

async function getMemberByPhone(req, res) {
  const member = await Member.findOne({ phone: req.params.phone });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  return res.json({ member });
}

async function createMember(req, res) {
  const { name, phone, tier, lifetimeSpend } = req.body;
  const spend = lifetimeSpend === undefined ? 0 : Number(lifetimeSpend);
  const resolvedTier = spend >= REWARD_RULES.platinumLifetimeSpend ? 'Platinum' : tier;
  const member = await Member.create({ name, phone, tier: resolvedTier, lifetimeSpend: spend });
  return res.status(201).json({ member });
}

async function listMembers(req, res) {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const sortField = ['name', 'phone', 'tier', 'points', 'createdAt'].includes(req.query.sortBy)
    ? req.query.sortBy
    : 'name';
  const sortDirection = req.query.order === 'desc' ? -1 : 1;
  const search = String(req.query.search || '').trim();
  const filter = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }] } : {};
  const [members, total] = await Promise.all([
    Member.find(filter).sort({ [sortField]: sortDirection }).skip((page - 1) * limit).limit(limit),
    Member.countDocuments(filter),
  ]);
  return res.json({
    members,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    sort: { field: sortField, order: sortDirection === 1 ? 'asc' : 'desc' },
  });
}

module.exports = { getMemberByPhone, createMember, listMembers };