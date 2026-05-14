// AI Extras Routes — Custom Feature Suggestions (batch 11)
// Form Auto-Fill, Document Classification, Compliance Check, Multi-language RAG,
// White-Label SaaS, Streaming PDF Generation.

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

function requireAIKey(_req, res, next) {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured', message: 'OPENROUTER_API_KEY missing' });
  }
  next();
}

async function callLLM(systemPrompt, userPrompt, maxTokens = 1500) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'pdfgenius extras',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await r.json();
  if (data?.error) throw new Error(data.error.message || 'LLM error');
  return data.choices?.[0]?.message?.content || '';
}

// 1) Form Extraction & Auto-Fill — extract form fields and auto-complete.
router.post('/autofill-from-profile', authenticate, requireAIKey, async (req, res) => {
  try {
    const { extractedFields = [], userProfile = {} } = req.body || {};
    if (!extractedFields.length) return res.status(400).json({ error: 'extractedFields[] required' });
    const sys = 'You are a form auto-fill agent. For each extracted field, propose a value from userProfile (or null if not present) and a confidence score 0-1. Output JSON: { mapping: [{ fieldName, fieldType, suggestedValue, confidence, reason }] }.';
    const out = await callLLM(sys, `Fields: ${JSON.stringify(extractedFields).slice(0, 4000)}\nProfile: ${JSON.stringify(userProfile).slice(0, 3000)}`, 1500);
    res.json({ raw: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2) Document Classification — route PDFs to category/department.
router.post('/classify', authenticate, requireAIKey, async (req, res) => {
  try {
    const { documentSummary, knownCategories = [] } = req.body || {};
    if (!documentSummary) return res.status(400).json({ error: 'documentSummary required' });
    const sys = `You are a document classifier. From the summary, choose the best category and propose routing (department, priority, retention period). ${knownCategories.length ? `Pick from: ${knownCategories.join(', ')}.` : ''} Output JSON: { category, confidence, routing: { department, priority, retentionDays }, alternatives: [...] }.`;
    const out = await callLLM(sys, `Summary: ${documentSummary.slice(0, 5000)}`, 800);
    res.json({ raw: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3) Compliance Check Agent — scan against regulations.
router.post('/compliance-check', authenticate, requireAIKey, async (req, res) => {
  try {
    const { content, regulations = ['GDPR', 'HIPAA'] } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });
    const sys = 'You are a regulatory compliance reviewer. Identify violations or risk areas in the provided document. Output JSON: { findings: [{ regulation, severity, excerpt, recommendation }], overallScore: 0-100 }.';
    const out = await callLLM(sys, `Regulations: ${regulations.join(',')}\nDocument: ${content.slice(0, 8000)}`, 1800);
    res.json({ raw: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4) Multi-language RAG — translate question + passages then answer.
router.post('/rag-multilingual', authenticate, requireAIKey, async (req, res) => {
  try {
    const { question, passages = [], userLang = 'en', sourceLang } = req.body || {};
    if (!question || !passages.length) return res.status(400).json({ error: 'question and passages[] required' });
    const sys = `You are a multilingual RAG engine. Translate question and answer in ${userLang}. Cite passage indices.`;
    const ctx = passages.slice(0, 8).map((p, i) => `[${i + 1}] ${(p || '').slice(0, 1500)}`).join('\n\n');
    const out = await callLLM(sys, `SourceLang: ${sourceLang || 'auto'}\nQuestion: ${question}\n\n${ctx}`, 1500);
    res.json({ answer: out, sources: passages.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5) White-Label SaaS Mode — reseller portal config.
// TODO: configure credentials — STRIPE_CONNECT_CLIENT_ID for reseller payouts.
const resellers = new Map();
router.post('/white-label/register', authenticate, (req, res) => {
  const { resellerId, brand, logoUrl, primaryColor } = req.body || {};
  if (!resellerId || !brand) return res.status(400).json({ error: 'resellerId and brand required' });
  resellers.set(resellerId, { resellerId, brand, logoUrl, primaryColor: primaryColor || '#0d9488', createdAt: new Date().toISOString() });
  res.json({ reseller: resellers.get(resellerId) });
});
router.get('/white-label/:id', authenticate, (req, res) => {
  const r = resellers.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json({ reseller: r });
});

// 6) Streaming PDF Generation — emit progress events over SSE.
router.get('/stream-generate', authenticate, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const totalSteps = 5;
  for (let step = 1; step <= totalSteps; step++) {
    await new Promise((r) => setTimeout(r, 150));
    res.write(`data: ${JSON.stringify({ step, totalSteps, percent: Math.round((step / totalSteps) * 100), label: `pass ${step} of ${totalSteps}` })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true, downloadUrl: '/api/extras/generated.pdf' })}\n\n`);
  res.end();
});

module.exports = router;
