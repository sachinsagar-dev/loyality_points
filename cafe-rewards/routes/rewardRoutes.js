const express = require('express');
const { recordPurchase, redeemMemberPoints } = require('../controllers/rewardController');

const router = express.Router();
router.post('/:id/purchase', recordPurchase);
router.post('/:id/redeem', redeemMemberPoints);

module.exports = router;