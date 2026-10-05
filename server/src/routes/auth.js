const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { httpError, asyncHandler } = require('../utils/http');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

router.post('/register', limiter, asyncHandler(async (req, res) => {
  // String() blocks object payloads such as { "$ne": "" } (NoSQL injection)
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Enter a valid email address');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (await User.findOne({ email })) throw httpError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user._id), user: publicUser(user) });
}));

router.post('/login', limiter, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const user = await User.findOne({ email }).select('+password');
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw httpError(401, 'Email or password is incorrect');

  res.json({ token: sign(user._id), user: publicUser(user) });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw httpError(401, 'Account not found');
  res.json({ user: publicUser(user) });
}));

module.exports = router;
