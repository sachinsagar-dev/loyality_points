const test = require('node:test');
const assert = require('node:assert/strict');
const Member = require('../models/Member');
const { calculatePointsEarned } = require('../services/rewardService');

test('calculates points using the current tier multiplier', () => {
  assert.equal(calculatePointsEarned(10, 'Regular'), 10);
  assert.equal(calculatePointsEarned(10, 'Silver'), 12);
  assert.equal(calculatePointsEarned(10, 'Gold'), 15);
});

test('rounds fractional earned points down', () => {
  assert.equal(calculatePointsEarned(0.99, 'Regular'), 0);
});

test('rejects invalid purchases and tiers', () => {
  assert.throws(() => calculatePointsEarned(0, 'Regular'), /positive number/);
  assert.throws(() => calculatePointsEarned(10, 'Platinum'), /Invalid member tier/);
});

test('member schema protects tier and point invariants', () => {
  const tierPath = Member.schema.path('tier');
  const pointsPath = Member.schema.path('points');
  assert.deepEqual(tierPath.enumValues, ['Regular', 'Silver', 'Gold']);
  assert.equal(pointsPath.options.default, 0);
  assert.equal(pointsPath.options.min, 0);
});