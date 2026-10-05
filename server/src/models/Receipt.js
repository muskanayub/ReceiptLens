const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: null }, // the line amount printed on the receipt
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchant: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    currency: { type: String, default: 'INR' },
    category: { type: String, default: 'Other' },
    items: [itemSchema],
    subtotal: { type: Number, default: null },
    discount: { type: Number, default: null },
    tax: { type: Number, default: null },
    tip: { type: Number, default: null },
    total: { type: Number, default: null },
    notes: { type: String, default: '' },
    warnings: [String], // problems found when checking the numbers
    reviewed: { type: Boolean, default: false }, // true once the person has saved their edits
    imageData: { type: Buffer, select: false },
    imageType: String,
  },
  { timestamps: true }
);

receiptSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
