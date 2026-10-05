/**
 * Minimal Gemini REST client that returns structured JSON.
 * Plain fetch (Node 18+), so there is no SDK to keep in sync. Only this file knows the provider.
 */
const { httpError } = require('../utils/http');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const model = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(path, body, attempt = 0) {
  if (!process.env.GEMINI_API_KEY) throw httpError(500, 'GEMINI_API_KEY is not set on the server');

  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (res.ok) return res.json();

  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await sleep(1000 * 2 ** attempt);
    return callGemini(path, body, attempt + 1);
  }

  console.error(`AI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  throw httpError(
    502,
    res.status === 429
      ? 'The AI service is busy or the free quota is used up. Try again in a minute.'
      : 'The AI service returned an error. Check the server logs.'
  );
}

/** parts: Gemini content parts (text and/or inlineData). schema: a response schema for the JSON shape. */
async function generateJson({ system, parts, schema }) {
  const data = await callGemini(`models/${model()}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  });

  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    throw httpError(502, 'The AI returned a result that could not be read. Try the photo again.');
  }
}

module.exports = { generateJson };
