const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const Receipt = require('../models/Receipt');
const { extractReceipt } = require('../services/extract');
const { sanitizeReceipt, checkTotals } = require('../utils/receiptData');
const { sniffImageType } = require('../utils/sniff');
const { toCsv } = require('../utils/csv');
const { httpError, asyncHandler } = require('../utils/http');

const router = express.Router();
router.use(auth);

const defaultCurrency = () => process.env.DEFAULT_CURRENCY || 'INR';
const scanLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : httpError(400, 'Upload a JPG, PNG or WebP photo'), ok);
  },
});

const today = () => new Date().toISOString().slice(0, 10);
const toDate = (iso) => new Date(`${iso}T00:00:00Z`);

function publicReceipt(doc) {
  const obj = doc.toObject();
  delete obj.imageData;
  delete obj.__v;
  return obj;
}

// month "YYYY-MM" -> [start, end) in UTC
function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return null;
  const [y, m] = month.split('-').map(Number);
  return { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) };
}

function buildFilter(userId, query) {
  const filter = { user: userId };
  const range = monthRange(query.month);
  if (range) filter.date = range;
  if (query.category) filter.category = String(query.category);
  if (query.q) filter.merchant = { $regex: String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  return filter;
}

router.get('/', asyncHandler(async (req, res) => {
  const receipts = await Receipt.find(buildFilter(req.userId, req.query)).sort({ date: -1, createdAt: -1 }).limit(300);
  res.json({ receipts: receipts.map(publicReceipt) });
}));

// Must be registered before "/:id"
router.get('/export.csv', asyncHandler(async (req, res) => {
  const receipts = await Receipt.find(buildFilter(req.userId, req.query)).sort({ date: -1 });
  const csv = toCsv(
    [
      { label: 'Date', value: (r) => r.date.toISOString().slice(0, 10) },
      { label: 'Merchant', value: (r) => r.merchant },
      { label: 'Category', value: (r) => r.category },
      { label: 'Currency', value: (r) => r.currency },
      { label: 'Subtotal', value: (r) => r.subtotal },
      { label: 'Discount', value: (r) => r.discount },
      { label: 'Tax', value: (r) => r.tax },
      { label: 'Tip', value: (r) => r.tip },
      { label: 'Total', value: (r) => r.total },
      { label: 'Items', value: (r) => r.items.map((i) => `${i.name} x${i.qty} ${i.price ?? ''}`.trim()).join('; ') },
      { label: 'Notes', value: (r) => r.notes },
    ],
    receipts
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="receipts.csv"');
  res.send(csv);
}));

router.post('/', scanLimiter, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a photo of a receipt');

  const mimeType = sniffImageType(req.file.buffer);
  if (!mimeType) throw httpError(400, 'That file is not a valid JPG, PNG or WebP image');

  const limit = Number(process.env.MAX_RECEIPTS_PER_USER || 200);
  if ((await Receipt.countDocuments({ user: req.userId })) >= limit) {
    throw httpError(400, `You can keep up to ${limit} receipts. Delete some to add more.`);
  }

  const data = await extractReceipt(req.file.buffer, mimeType);
  const warnings = checkTotals(data);
  if (!data.date) warnings.unshift("The date could not be read, so today's date was used.");

  const receipt = await Receipt.create({
    ...data,
    date: toDate(data.date || today()),
    user: req.userId,
    warnings,
    imageData: req.file.buffer,
    imageType: mimeType,
  });
  res.status(201).json({ receipt: publicReceipt(receipt) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.userId });
  if (!receipt) throw httpError(404, 'Receipt not found');
  res.json({ receipt: publicReceipt(receipt) });
}));

router.get('/:id/image', asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.userId }).select('+imageData imageType');
  if (!receipt || !receipt.imageData) throw httpError(404, 'Image not found');
  res.setHeader('Content-Type', receipt.imageType || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(receipt.imageData);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, user: req.userId });
  if (!receipt) throw httpError(404, 'Receipt not found');

  const data = sanitizeReceipt(req.body || {}, { defaultCurrency: defaultCurrency() });
  receipt.set({ ...data, date: toDate(data.date || today()) });
  receipt.warnings = checkTotals(data);
  receipt.reviewed = true;
  await receipt.save();

  res.json({ receipt: publicReceipt(receipt) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!receipt) throw httpError(404, 'Receipt not found');
  res.json({ ok: true });
}));

module.exports = router;
