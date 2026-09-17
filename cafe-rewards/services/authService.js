const crypto = require('crypto');
const User = require('../models/User');

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getSecret() {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is not configured');
  return process.env.AUTH_SECRET;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = storedHash.split(':');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const expected = Buffer.from(key, 'hex');
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user._id.toString(),
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) throw new AuthError('Invalid authentication token', 401);
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AuthError('Invalid authentication token', 401);
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw new AuthError('Authentication token expired', 401);
  return data;
}

async function registerUser({ name, email, password }) {
  if (!name || !email || !password || password.length < 8) {
    throw new AuthError('Name, email, and a password of at least 8 characters are required', 400);
  }
  const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
  return { user: { id: user._id, name: user.name, email: user.email }, token: createToken(user) };
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new AuthError('Email and password are required', 400);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError('Invalid email or password', 401);
  }
  return { user: { id: user._id, name: user.name, email: user.email }, token: createToken(user) };
}

module.exports = { AuthError, registerUser, loginUser, verifyToken };