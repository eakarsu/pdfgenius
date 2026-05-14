const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiRateLimiter, logAIUsage } = require('../utils/ai-helpers');
const { embed, cosineSimilarity } = require('../services/openrouter.service');
const { Document, FormField, FormAutofill } = require('../models');

/**
 * POST /api/autofill/suggest/:documentId
 * For each form field on the target document, find the best-matching
 * field name from the user's other documents (by embedding cosine sim)
 * and propose a value.
 */
router.post('/suggest/:documentId', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const limit = aiRateLimiter(req.userId);
    if (!limit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', resetAt: limit.resetAt });
    }
    const targetDoc = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
    });
    if (!targetDoc) return res.status(404).json({ error: 'Document not found' });

    const targetFields = await FormField.findAll({ where: { document_id: targetDoc.id } });
    if (targetFields.length === 0) {
      return res.json({ suggestions: [], message: 'No form fields detected on target document.' });
    }

    // Pull all historical fields for this user
    const otherFields = await FormField.findAll({
      include: [{ model: Document, as: 'document', where: { user_id: req.userId } }],
    });
    const candidatePool = otherFields.filter((f) => f.document_id !== targetDoc.id && f.value);
    if (candidatePool.length === 0) {
      return res.json({ suggestions: [], message: 'No prior form data to learn from.' });
    }

    // Embed everything in two batches
    const targetNames = targetFields.map((f) => f.name || '');
    const candidateNames = candidatePool.map((f) => f.name || '');
    const [tEmbs, cEmbs] = await Promise.all([embed(targetNames), embed(candidateNames)]);

    const suggestions = [];
    for (let i = 0; i < targetFields.length; i++) {
      let best = { score: -1, idx: -1 };
      for (let j = 0; j < candidatePool.length; j++) {
        const s = cosineSimilarity(tEmbs[i], cEmbs[j]);
        if (s > best.score) best = { score: s, idx: j };
      }
      if (best.idx === -1 || best.score < 0.6) continue;

      const source = candidatePool[best.idx];
      const row = await FormAutofill.create({
        user_id: req.userId,
        document_id: targetDoc.id,
        field_name: targetFields[i].name,
        suggested_value: source.value,
        source_document_id: source.document_id,
        source_field_name: source.name,
        similarity_score: best.score,
      });
      suggestions.push(row);
    }

    await logAIUsage({
      userId: req.userId,
      feature: 'form-autofill',
      input: { documentId: targetDoc.id, targetCount: targetFields.length },
      output: { suggestionCount: suggestions.length },
      durationMs: Date.now() - start,
    });

    res.json({ suggestions, count: suggestions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/autofill/:documentId — list suggestions */
router.get('/:documentId', authenticate, async (req, res) => {
  try {
    const rows = await FormAutofill.findAll({
      where: { document_id: req.params.documentId, user_id: req.userId },
      order: [['similarity_score', 'DESC']],
    });
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/autofill/:id — accept/reject a suggestion */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const row = await FormAutofill.findOne({ where: { id: req.params.id, user_id: req.userId } });
    if (!row) return res.status(404).json({ error: 'Not found' });
    await row.update({ accepted: !!req.body.accepted });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
