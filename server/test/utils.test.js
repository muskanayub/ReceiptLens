const test = require('node:test');
const assert = require('node:assert');
const { toCsv, cell } = require('../src/utils/csv');
const { sniffImageType } = require('../src/utils/sniff');

test('csv quotes commas, quotes and newlines', () => {
  assert.strictEqual(cell('a,b'), '"a,b"');
  assert.strictEqual(cell('say "hi"'), '"say ""hi"""');
  assert.strictEqual(cell('line1\nline2'), '"line1\nline2"');
});

test('csv neutralises spreadsheet formulas but keeps negative numbers', () => {
  assert.strictEqual(cell('=HYPERLINK("http://x")').startsWith('"\'='), true);
  assert.strictEqual(cell('+91 98765'), "'+91 98765");
  assert.strictEqual(cell(-5), '-5');
});

test('toCsv builds a header and rows', () => {
  const csv = toCsv([{ label: 'A', value: (r) => r.a }, { label: 'B', value: (r) => r.b }], [{ a: 1, b: 'x,y' }]);
  assert.strictEqual(csv, 'A,B\r\n1,"x,y"');
});

test('sniffImageType recognises real image headers only', () => {
  const pad = Buffer.alloc(16);
  assert.strictEqual(sniffImageType(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), pad])), 'image/jpeg');
  assert.strictEqual(sniffImageType(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pad])), 'image/png');
  assert.strictEqual(sniffImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), pad])), 'image/webp');
  assert.strictEqual(sniffImageType(Buffer.from('<html>not an image at all</html>')), null);
});
