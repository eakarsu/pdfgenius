// === Batch 11 Gaps & Frontend Mounts ===
// Gap features (AI counterparts + Non-AI features) for pdfgenius.
// Lazy gap_features table (in-memory), OpenRouter via native fetch.

const express = require('express');
const router = express.Router();

const gapFeatures = new Map();

async function llm(systemPrompt, userMsg, maxTokens = 1400) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { const e = new Error('OPENROUTER_API_KEY not configured'); e.status = 503; throw e; }
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'pdfgenius Gap Features' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], max_tokens: maxTokens }),
  });
  const data = await r.json();
  if (data && data.error) throw new Error(data.error.message || 'LLM error');
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function track(slug, payload) {
  const list = gapFeatures.get(slug) || [];
  list.push({ at: new Date().toISOString(), payload });
  gapFeatures.set(slug, list);
}

function safe(res, e) { return res.status((e && e.status) || 500).json({ error: (e && e.message) || 'request failed' }); }

// ---- AI Gap Counterparts ----

router.post('/gap-ocr-pipeline', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You extract text from PDF images. Return clean structured text with page numbers.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('ocr-pipeline', { keys: Object.keys(body) });
    res.json({ extraction: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-pdf-classifier', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You classify PDFs into categories (contract, invoice, report, form, other) and route to appropriate department.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('pdf-classifier', { keys: Object.keys(body) });
    res.json({ classification: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-translation-rag', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You translate PDF Q&A across languages while preserving meaning and formatting.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('translation-rag', { keys: Object.keys(body) });
    res.json({ translation: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-structured-export', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You extract structured JSON from PDFs matching a provided schema. Return strict JSON only.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('structured-export', { keys: Object.keys(body) });
    res.json({ json: out });
  } catch (e) { safe(res, e); }
});

// ---- Non-AI Gap Features ----

router.post('/gap-collaboration-commenting', (req, res) => {
  const body = req.body || {};
  const record = { id: 'collaboration-commenting_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('collaboration-commenting', record);
  res.json({ comment: record, status: 'recorded' });
});

router.post('/gap-versioning', (req, res) => {
  const body = req.body || {};
  const record = { id: 'versioning_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('versioning', record);
  res.json({ version: record, status: 'recorded' });
});

router.post('/gap-watermarking-drm', (req, res) => {
  const body = req.body || {};
  const record = { id: 'watermarking-drm_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('watermarking-drm', record);
  res.json({ watermark: record, status: 'recorded' });
});

router.post('/gap-batch-processing', (req, res) => {
  const body = req.body || {};
  const record = { id: 'batch-processing_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('batch-processing', record);
  res.json({ job: record, status: 'recorded' });
});

router.post('/gap-esign-integration', (req, res) => {
  const body = req.body || {};
  const record = { id: 'esign-integration_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('esign-integration', record);
  res.json({ request: record, status: 'recorded' });
});

router.post('/gap-sso-enterprise', (req, res) => {
  const body = req.body || {};
  const record = { id: 'sso-enterprise_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('sso-enterprise', record);
  res.json({ config: record, status: 'recorded' });
});

router.get('/gap-features/_audit', (req, res) => {
  const rows = [];
  for (const [k, v] of gapFeatures.entries()) rows.push({ feature: k, events: v.length });
  res.json({ rows });
});

module.exports = router;
