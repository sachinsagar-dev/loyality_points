function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid member ID' });
  if (error.code === 11000) return res.status(409).json({ error: 'A member with that phone number already exists' });
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  return res.status(statusCode).json({ error: statusCode >= 500 ? 'Internal server error' : error.message });
}

module.exports = errorHandler;