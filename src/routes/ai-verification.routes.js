'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
const wave1b = require('../services/wave1b.service');
const reviewTasks = wave1b.createTaskStore();

async function ownDocument(req, documentId) {
  const docs = await sequelize.query('SELECT id, original_name, status, total_pages, file_size, mime_type, created_at FROM documents WHERE id = :id AND user_id = :userId', { replacements: { id: String(documentId), userId: req.userId }, type: QueryTypes.SELECT });
  if (!docs[0]) return null;
  const pages = await sequelize.query('SELECT page_number, extracted_text FROM document_pages WHERE document_id = :id ORDER BY page_number', { replacements: { id: String(documentId) }, type: QueryTypes.SELECT });
  return { document: docs[0], pages };
}
async function aiDocument(req, feature, fallback) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY; const model = process.env.OPENROUTER_MODEL; const baseUrl = process.env.OPENROUTER_BASE_URL;
  if (!apiKey || !model || !baseUrl) return fallback;
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: `Return ONLY JSON {summary:string, findings:string[], recommendations:string[], metrics:object} for PDF feature ${feature}. Preserve false/0 values.` }, { role: 'user', content: JSON.stringify(fallback.sections).slice(0, 8000) }] }), signal: AbortSignal.timeout(60000) });
    if (!r.ok) return fallback;
    const p = await r.json(); const parsed = JSON.parse(String(p.choices?.[0]?.message?.content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    return { provider: 'openrouter', aiGenerated: true, model, feature, sections: parsed };
  } catch (_) { return fallback; }
}
router.post('/document-summary', authenticate, async (req, res, next) => { try { const found = await ownDocument(req, req.body?.documentId); if (!found) return res.status(404).json({ error: 'Document not found' }); return res.json(await aiDocument(req, 'document-summary', wave1b.documentSummary(found.document, found.pages))); } catch (e) { return next(e); } });
router.post('/document-qa', authenticate, async (req, res, next) => { try { const found = await ownDocument(req, req.body?.documentId); if (!found) return res.status(404).json({ error: 'Document not found' }); return res.json(await aiDocument(req, 'document-qa', wave1b.documentQa(found.document, found.pages, req.body?.question || ''))); } catch (e) { return next(e); } });
router.post('/document-key-fields', authenticate, async (req, res, next) => { try { const found = await ownDocument(req, req.body?.documentId); if (!found) return res.status(404).json({ error: 'Document not found' }); return res.json(await aiDocument(req, 'document-key-fields', wave1b.documentKeyFields(found.document, found.pages))); } catch (e) { return next(e); } });
router.get('/documents/export', authenticate, async (req, res, next) => { try { const docs = await sequelize.query('SELECT id, original_name, status, total_pages, file_size, mime_type, created_at FROM documents WHERE user_id = :userId ORDER BY created_at DESC LIMIT 1000', { replacements: { userId: req.userId }, type: QueryTypes.SELECT }); if (String(req.query.format || 'json').toLowerCase() === 'csv') { res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="documents.csv"'); return res.send(wave1b.toCsv(docs, wave1b.DOCUMENT_COLUMNS)); } return res.json({ data: docs, total: docs.length }); } catch (e) { return next(e); } });
router.get('/review-tasks', authenticate, (req, res) => res.json({ data: reviewTasks.list(req.userId, req.query) }));
router.post('/review-tasks', authenticate, (req, res) => { try { return res.status(201).json({ task: reviewTasks.create(req.userId, req.body || {}) }); } catch (e) { return res.status(e.status || 400).json({ error: e.message, code: e.code || 'VALIDATION_ERROR' }); } });
router.patch('/review-tasks/:id', authenticate, (req, res) => { try { const task = reviewTasks.update(req.userId, req.params.id, req.body || {}); return task ? res.json({ task }) : res.status(404).json({ error: 'Task not found' }); } catch (e) { return res.status(e.status || 400).json({ error: e.message, code: e.code || 'VALIDATION_ERROR' }); } });

function setting(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.status = 503;
    throw error;
  }
  return value;
}

router.post('/recommendation', authenticate, async (req, res, next) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) {
      return res.status(400).json({ error: 'prompt must contain 1 to 4000 characters' });
    }
    const apiKey = setting('OPENROUTER_API_KEY');
    const model = setting('OPENROUTER_MODEL');
    const baseUrl = setting('OPENROUTER_BASE_URL').replace(/\/$/, '');
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `http://127.0.0.1:${process.env.FRONTEND_PORT}`,
        'X-Title': 'PDFGenius Local Verification',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Give one concise recommendation for reviewing a synthetic PDF.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 160,
      }),
    });
    if (!upstream.ok) {
      const error = new Error(`OpenRouter request failed with status ${upstream.status}`);
      error.status = 502;
      throw error;
    }
    const payload = await upstream.json();
    const content = payload.choices?.[0]?.message?.content?.trim();
    const providerRequestId = typeof payload.id === 'string' ? payload.id.trim() : '';
    const resolvedModel = typeof payload.model === 'string' && payload.model.trim() ? payload.model.trim() : model;
    if (!content || !providerRequestId) {
      const error = new Error('OpenRouter returned an incomplete response');
      error.status = 502;
      throw error;
    }
    const [receipt] = await sequelize.query(
      `INSERT INTO ai_provider_receipts
         (user_id, prompt, content, provider, provider_request_id, model)
       VALUES (:userId, :prompt, :content, 'openrouter', :providerRequestId, :model)
       RETURNING id, provider, provider_request_id, model, created_at`,
      {
        replacements: { userId: req.userId, prompt, content, providerRequestId, model: resolvedModel },
        type: QueryTypes.INSERT,
      },
    );
    return res.json({ content, receipt: Array.isArray(receipt) ? receipt[0] : receipt });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
