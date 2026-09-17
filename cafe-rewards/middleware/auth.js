const { verifyToken } = require('../services/authService');

function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    req.user = verifyToken(header.slice(7));
    return next();
  } catch (error) {
    return next(error.statusCode ? error : Object.assign(error, { statusCode: 401 }));
  }
}

module.exports = requireAuth;