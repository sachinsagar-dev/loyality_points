const { registerUser, loginUser } = require('../services/authService');

async function register(req, res) {
  return res.status(201).json(await registerUser(req.body));
}

async function login(req, res) {
  return res.json(await loginUser(req.body));
}

module.exports = { register, login };