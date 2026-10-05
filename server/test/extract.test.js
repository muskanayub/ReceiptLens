const test = require('node:test');
const assert = require('node:assert');

// The vision API is replaced with a stub so the whole extraction path can be tested offline.
function stubGemini(payload) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }) };
  };
  return calls;
}

process.env.GEMINI_API_KEY = 'test-key';
const { extractReceipt } = require('../src/services/extract');

test('extractReceipt sends the image and a JSON schema, and returns clean data', async () => {
  const calls = stubGemini({
    isReceipt: true, merchant: ' Green Mart ', date: '2026-10-01', currency: 'inr', category: 'Groceries',
    items: [{ name: 'Rice 5kg', qty: 1, price: 420 }, { name: 'Milk', qty: 2, price: 120 }],
    subtotal: 540, tax: 27, total: 567,
  });

  const result = await extractReceipt(Buffer.from('fake image bytes'), 'image/jpeg');

  assert.strictEqual(calls.length, 1);
  const { body, headers } = calls[0];
  assert.strictEqual(headers['x-goog-api-key'], 'test-key');
  assert.strictEqual(body.contents[0].parts[0].inlineData.mimeType, 'image/jpeg');
  assert.strictEqual(body.contents[0].parts[0].inlineData.data, Buffer.from('fake image bytes').toString('base64'));
  assert.strictEqual(body.generationConfig.responseMimeType, 'application/json');
  assert.ok(body.generationConfig.responseSchema.properties.items);

  assert.strictEqual(result.merchant, 'Green Mart');
  assert.strictEqual(result.currency, 'INR');
  assert.strictEqual(result.total, 567);
  assert.strictEqual(result.items.length, 2);
});

test('extractReceipt rejects images that are not receipts', async () => {
  stubGemini({ isReceipt: false, items: [] });
  await assert.rejects(() => extractReceipt(Buffer.from('x'), 'image/png'), (err) => err.status === 422);
});

test('extractReceipt survives sloppy model output', async () => {
  stubGemini({ isReceipt: true, category: 'Nonsense', total: '₹99', items: [{ name: 'Tea', price: 'abc' }] });
  const result = await extractReceipt(Buffer.from('x'), 'image/png');
  assert.strictEqual(result.category, 'Other');
  assert.strictEqual(result.total, 99);
  assert.strictEqual(result.items[0].price, null);
});
