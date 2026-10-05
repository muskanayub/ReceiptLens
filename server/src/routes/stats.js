const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Receipt = require('../models/Receipt');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
router.use(auth);

const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const round2 = (n) => Math.round(n * 100) / 100;

router.get('/', asyncHandler(async (req, res) => {
  const user = new mongoose.Types.ObjectId(req.userId);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || '') ? req.query.month : monthKey(new Date());
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const trendStart = new Date(Date.UTC(y, m - 6, 1)); // this month plus the five before it

  // Totals are only meaningful within one currency, so the dashboard shows one at a time
  const currencies = await Receipt.distinct('currency', { user });
  const currency = currencies.includes(req.query.currency)
    ? req.query.currency
    : currencies.includes(process.env.DEFAULT_CURRENCY || 'INR')
      ? process.env.DEFAULT_CURRENCY || 'INR'
      : currencies[0] || process.env.DEFAULT_CURRENCY || 'INR';

  const inMonth = { user, currency, date: { $gte: start, $lt: end }, total: { $ne: null } };

  const [summary, byCategory, merchants, trend] = await Promise.all([
    Receipt.aggregate([
      { $match: inMonth },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Receipt.aggregate([
      { $match: inMonth },
      { $group: { _id: '$category', total: { $sum: '$total' } } },
      { $sort: { total: -1 } },
    ]),
    Receipt.aggregate([
      { $match: { ...inMonth, merchant: { $ne: '' } } },
      { $group: { _id: '$merchant', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    Receipt.aggregate([
      { $match: { user, currency, total: { $ne: null }, date: { $gte: trendStart, $lt: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$total' } } },
    ]),
  ]);

  const totals = Object.fromEntries(trend.map((t) => [t._id, t.total]));
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const key = monthKey(new Date(Date.UTC(y, m - 1 - i, 1)));
    monthly.push({ month: key, total: round2(totals[key] || 0) });
  }

  const total = round2(summary[0]?.total || 0);
  const count = summary[0]?.count || 0;

  res.json({
    month,
    currency,
    currencies,
    total,
    count,
    average: count ? round2(total / count) : 0,
    byCategory: byCategory.map((c) => ({ category: c._id, total: round2(c.total) })),
    topMerchants: merchants.map((x) => ({ merchant: x._id, total: round2(x.total), count: x.count })),
    monthly,
  });
}));

module.exports = router;
