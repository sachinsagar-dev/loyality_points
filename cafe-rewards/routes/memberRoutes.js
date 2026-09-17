const express = require('express');
const { getMemberByPhone, createMember } = require('../controllers/memberController');

const router = express.Router();
router.get('/:phone', getMemberByPhone);
router.post('/', createMember);

module.exports = router;