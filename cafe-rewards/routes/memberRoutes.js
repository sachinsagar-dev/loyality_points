const express = require('express');
const { getMemberByPhone, createMember, listMembers } = require('../controllers/memberController');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/', listMembers);
router.get('/:phone', getMemberByPhone);
router.post('/', createMember);

module.exports = router;