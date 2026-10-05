const test = require('node:test');
const assert = require('node:assert');
const { sanitizeReceipt, checkTotals } = require('../src/utils/receiptData');

const base = (over = {}) => sanitizeReceipt({
  merchant: 'Corner Cafe', date: '2026-09-14', currency: 'INR', category: 'Dining',
  items: [{ name: 'Latte', qty: 2, price: 300 }, { name: 'Cake', qty: 1, price: 150 }],
  subtotal: 450, tax: 22.5, total: 472.5, ...over,
});

test('sanitizeReceipt parses messy money strings', () => {
  const r = sanitizeReceipt({ total: '₹1,234.50', tax: 'abc', items: [{ name: 'Tea', price: '₹ 40' }] });
  assert.strictEqual(r.total, 1234.5);
  assert.strictEqual(r.tax, null);
  assert.strictEqual(r.items[0].price, 40);
});

test('sanitizeReceipt falls back safely on bad values', () => {
  const r = sanitizeReceipt({ category: 'Weapons', currency: 'rupees', date: '2026-13-45' }, { defaultCurrency: 'INR' });
  assert.strictEqual(r.category, 'Other');
  assert.strictEqual(r.currency, 'INR');
  assert.strictEqual(r.date, null);
});

test('sanitizeReceipt rejects far-future and pre-2000 dates', () => {
  assert.strictEqual(sanitizeReceipt({ date: '2999-01-01' }).date, null);
  assert.strictEqual(sanitizeReceipt({ date: '1985-05-05' }).date, null);
  assert.strictEqual(sanitizeReceipt({ date: '2026-09-14' }).date, '2026-09-14');
});

test('sanitizeReceipt drops nameless items, caps the list and defaults quantity', () => {
  const many = Array.from({ length: 150 }, (_, i) => ({ name: `Item ${i}`, price: 1 }));
  const r = sanitizeReceipt({ items: [{ name: '  ', price: 5 }, { name: 'Milk', qty: -2, price: 3 }, ...many] });
  assert.strictEqual(r.items.length, 100);
  assert.strictEqual(r.items[0].name, 'Milk');
  assert.strictEqual(r.items[0].qty, 1);
});

test('sanitizeReceipt strips object payloads from text fields', () => {
  const r = sanitizeReceipt({ merchant: { $ne: '' } });
  assert.strictEqual(typeof r.merchant, 'string');
});

test('checkTotals accepts a receipt where everything adds up', () => {
  assert.deepStrictEqual(checkTotals(base()), []);
});

test('checkTotals accepts tax-inclusive prices', () => {
  assert.deepStrictEqual(checkTotals(base({ tax: 21.43, total: 450 })), []);
});

test('checkTotals allows small rounding differences', () => {
  assert.deepStrictEqual(checkTotals(base({ total: 472 })), []);
});

test('checkTotals flags a wrong total', () => {
  const warnings = checkTotals(base({ total: 600 }));
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /472\.50.*600\.00/);
});

test('checkTotals flags a subtotal that disagrees with the items', () => {
  const warnings = checkTotals(base({ subtotal: 400, total: 422.5 }));
  assert.ok(warnings.some((w) => /subtotal/.test(w)));
});

test('checkTotals handles discounts and tips', () => {
  const r = base({ subtotal: 450, discount: 50, tax: 20, tip: 10, total: 430 });
  assert.deepStrictEqual(checkTotals(r), []);
});

test('checkTotals flags a missing total and missing items', () => {
  assert.ok(checkTotals(base({ total: null })).some((w) => /total could not be read/.test(w)));
  assert.ok(checkTotals(base({ items: [], subtotal: null, total: 100 })).some((w) => /No line items/.test(w)));
});
