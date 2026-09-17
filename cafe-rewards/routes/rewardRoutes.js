const express = require('express');
const { recordPurchase, redeemMemberPoints, getMemberTransactions } = require('../controllers/rewardController');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/:id/transactions', getMemberTransactions);
router.post('/:id/purchase', recordPurchase);
router.post('/:id/redeem', redeemMemberPoints);

module.exports = router;