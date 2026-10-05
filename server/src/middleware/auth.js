const jwt = require('jsonwebtoken');
const { httpError } = require('../utils/http');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Please sign in to continue'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    next(httpError(401, 'Your session has expired. Please sign in again'));
  }
};
