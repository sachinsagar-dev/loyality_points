const Member = require('../models/Member');
const Notification = require('../models/Notification');
const PointLot = require('../models/PointLot');
const Transaction = require('../models/Transaction');

// These values are deliberately centralized because the assessment does not define rates.
const REWARD_RULES = {
  currencyUnitsPerPoint: 1,
  platinumLifetimeSpend: 5000,
  pointExpiryDays: 90,
  tierMultipliers: { Regular: 1, Silver: 1.25, Gold: 1.5, Platinum: 0.3 },
};

class RewardError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function parsePositiveNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RewardError(`${fieldName} must be a positive number`, 400);
  }
  return number;
}

function getTierMultiplier(tier) {
  const multiplier = REWARD_RULES.tierMultipliers[tier];
  if (!multiplier) throw new RewardError('Invalid member tier', 400);
  return multiplier;
}

function getApplicableTier(currentTier, lifetimeSpend) {
  if (Number(lifetimeSpend) >= REWARD_RULES.platinumLifetimeSpend) return 'Platinum';
  return currentTier;
}

function calculatePointsEarned(purchaseAmount, tier) {
  const amount = parsePositiveNumber(purchaseAmount, 'purchaseAmount');
  const multiplier = getTierMultiplier(tier);
  return Math.floor((amount / REWARD_RULES.currencyUnitsPerPoint) * multiplier);
}

async function earnPoints(memberId, purchaseAmount) {
  const member = await Member.findById(memberId).select('tier lifetimeSpend');
  if (!member) throw new RewardError('Member not found', 404);

  const pointsEarned = calculatePointsEarned(purchaseAmount, member.tier);
  const amount = Number(purchaseAmount);
  const updatedMember = await Member.findOneAndUpdate(
    { _id: memberId, tier: member.tier },
    { $inc: { points: pointsEarned, lifetimeSpend: amount } },
    { new: true, runValidators: true }
  );

  if (!updatedMember) throw new RewardError('Member changed during purchase; please try again', 409);
  const newTier = getApplicableTier(member.tier, updatedMember.lifetimeSpend);
  if (newTier !== updatedMember.tier) {
    updatedMember.tier = newTier;
    await updatedMember.save();
    await Notification.create({
      member: updatedMember._id,
      type: 'tier_upgraded',
      eventKey: `${updatedMember._id}:${member.tier}:${newTier}`,
      payload: { fromTier: member.tier, toTier: newTier },
    });
  }
  if (pointsEarned > 0) {
    const earnedAt = new Date();
    const expiresAt = new Date(earnedAt.getTime() + REWARD_RULES.pointExpiryDays * 24 * 60 * 60 * 1000);
    await PointLot.create({ member: updatedMember._id, pointsRemaining: pointsEarned, earnedAt, expiresAt });
  }
  await Transaction.create({
    member: updatedMember._id,
    type: 'purchase',
    purchaseAmount: amount,
    pointsChange: pointsEarned,
    balanceAfter: updatedMember.points,
  });
  return { member: updatedMember, pointsEarned };
}

async function redeemPoints(memberId, pointsToRedeem) {
  const points = parsePositiveNumber(pointsToRedeem, 'points');
  if (!Number.isInteger(points)) throw new RewardError('points must be a positive whole number', 400);

  const member = await Member.findOneAndUpdate(
    { _id: memberId, points: { $gte: points } },
    { $inc: { points: -points } },
    { new: true, runValidators: true }
  );

  if (!member) {
    const existingMember = await Member.exists({ _id: memberId });
    if (!existingMember) throw new RewardError('Member not found', 404);
    throw new RewardError('Insufficient points', 400);
  }

  await Transaction.create({
    member: member._id,
    type: 'redemption',
    pointsChange: -points,
    balanceAfter: member.points,
  });
  await consumePointLots(member._id, points);
  return { member, pointsRedeemed: points };
}

async function consumePointLots(memberId, points) {
  let remaining = points;
  while (remaining > 0) {
    const lot = await PointLot.findOne({ member: memberId, pointsRemaining: { $gt: 0 } }).sort({ expiresAt: 1 });
    if (!lot) return;
    const used = Math.min(remaining, lot.pointsRemaining);
    const updatedLot = await PointLot.findOneAndUpdate(
      { _id: lot._id, pointsRemaining: { $gte: used } },
      { $inc: { pointsRemaining: -used } },
      { new: true }
    );
    if (updatedLot) remaining -= used;
  }
}

async function expireStalePoints(now = new Date()) {
  const expiryDate = new Date(now);
  if (Number.isNaN(expiryDate.getTime())) throw new RewardError('Invalid clock time', 400);
  const staleLots = await PointLot.find({ expiresAt: { $lte: expiryDate }, pointsRemaining: { $gt: 0 } });
  let expiredPoints = 0;
  let expiredLots = 0;
  for (const lot of staleLots) {
    const lockedLot = await PointLot.findOneAndUpdate(
      { _id: lot._id, pointsRemaining: { $gt: 0 } },
      { $set: { pointsRemaining: 0 } },
      { new: true }
    );
    if (!lockedLot) continue;
    const expired = lot.pointsRemaining;
    const member = await Member.findOneAndUpdate(
      { _id: lot.member, points: { $gte: expired } },
      { $inc: { points: -expired } },
      { new: true }
    );
    if (!member) continue;
    await Transaction.create({ member: member._id, type: 'expiration', pointsChange: -expired, balanceAfter: member.points });
    expiredPoints += expired;
    expiredLots += 1;
  }
  return { expiredLots, expiredPoints, now: expiryDate.toISOString() };
}

module.exports = {
  REWARD_RULES,
  RewardError,
  calculatePointsEarned,
  earnPoints,
  redeemPoints,
  getApplicableTier,
  consumePointLots,
  expireStalePoints,
};