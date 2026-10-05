/**
 * Everything the app does to receipt data lives here, so it can be tested without a database or an API.
 *   sanitizeReceipt: turns untrusted input (model output or a person's edits) into clean, typed data
 *   checkTotals:     compares line items, tax and tip against the printed total
 */
const CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Shopping', 'Health',
  'Utilities', 'Entertainment', 'Travel', 'Other',
];

const round2 = (n) => Math.round(n * 100) / 100;

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? round2(n) : null;
}

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function cleanDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
  if (!real || y < 2000 || date.getTime() > tomorrow) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function sanitizeReceipt(raw = {}, { defaultCurrency = 'INR' } = {}) {
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((item) => {
      const qty = num(item?.qty);
      return {
        name: text(item?.name, 120),
        qty: qty && qty > 0 ? qty : 1,
        price: num(item?.price),
      };
    })
    .filter((item) => item.name)
    .slice(0, 100);

  const currency = String(raw.currency ?? '').trim().toUpperCase();

  return {
    merchant: text(raw.merchant, 80),
    date: cleanDate(raw.date),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : defaultCurrency,
    category: CATEGORIES.includes(raw.category) ? raw.category : 'Other',
    items,
    subtotal: num(raw.subtotal),
    discount: num(raw.discount),
    tax: num(raw.tax),
    tip: num(raw.tip),
    total: num(raw.total),
    notes: text(raw.notes, 300),
  };
}

const fmt = (n) => n.toFixed(2);

function checkTotals(r) {
  const warnings = [];
  const itemsSum = round2(r.items.reduce((sum, i) => sum + (i.price || 0), 0));

  if (!r.items.length) warnings.push('No line items were found. Add them, or keep just the total.');
  if (r.total == null) {
    warnings.push('The total could not be read. Enter it before relying on this receipt.');
    return warnings;
  }

  // Printed totals are often rounded, so allow a small difference
  const tolerance = Math.max(0.06, Math.abs(r.total) * 0.005);
  const discount = r.discount || 0;
  const tax = r.tax || 0;
  const tip = r.tip || 0;

  if (r.subtotal != null && r.items.length && Math.abs(r.subtotal - itemsSum) > tolerance) {
    warnings.push(`The items add up to ${fmt(itemsSum)}, but the subtotal reads ${fmt(r.subtotal)}.`);
  }

  if (r.items.length || r.subtotal != null) {
    const base = r.subtotal ?? itemsSum;
    const withTax = round2(base - discount + tax + tip);
    const taxIncluded = round2(base - discount + tip); // prices that already include tax (common with GST or VAT)
    const matches = [withTax, taxIncluded].some((expected) => Math.abs(expected - r.total) <= tolerance);
    if (!matches) {
      warnings.push(`The items, tax and tip add up to ${fmt(withTax)}, but the total reads ${fmt(r.total)}.`);
    }
  }
  return warnings;
}

module.exports = { CATEGORIES, sanitizeReceipt, checkTotals, round2 };
