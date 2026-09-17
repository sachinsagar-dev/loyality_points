const Member = require('../models/Member');
const Transaction = require('../models/Transaction');

// These values are deliberately centralized because the assessment does not define rates.
const REWARD_RULES = {
  currencyUnitsPerPoint: 1,
  tierMultipliers: { Regular: 1, Silver: 1.25, Gold: 1.5 },
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

function calculatePointsEarned(purchaseAmount, tier) {
  const amount = parsePositiveNumber(purchaseAmount, 'purchaseAmount');
  const multiplier = getTierMultiplier(tier);
  return Math.floor((amount / REWARD_RULES.currencyUnitsPerPoint) * multiplier);
}

async function earnPoints(memberId, purchaseAmount) {
  const member = await Member.findById(memberId).select('tier');
  if (!member) throw new RewardError('Member not found', 404);

  const pointsEarned = calculatePointsEarned(purchaseAmount, member.tier);
  const updatedMember = await Member.findOneAndUpdate(
    { _id: memberId, tier: member.tier },
    { $inc: { points: pointsEarned } },
    { new: true, runValidators: true }
  );

  if (!updatedMember) throw new RewardError('Member changed during purchase; please try again', 409);
  await Transaction.create({
    member: updatedMember._id,
    type: 'purchase',
    purchaseAmount: Number(purchaseAmount),
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
  return { member, pointsRedeemed: points };
}

module.exports = { REWARD_RULES, RewardError, calculatePointsEarned, earnPoints, redeemPoints };