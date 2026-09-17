const Member = require('../models/Member');

async function getMemberByPhone(req, res) {
  const member = await Member.findOne({ phone: req.params.phone });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  return res.json({ member });
}

async function createMember(req, res) {
  const { name, phone, tier } = req.body;
  const member = await Member.create({ name, phone, tier });
  return res.status(201).json({ member });
}

module.exports = { getMemberByPhone, createMember };