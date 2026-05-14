const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiRateLimiter, logAIUsage, parseAIJson } = require('../utils/ai-helpers');
const { chat } = require('../services/openrouter.service');
const { DocumentTemplate, Document, ProcessingJob } = require('../models');

/**
 * GET /api/templates — list user templates + built-ins (paginated).
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '20', 10);
    const klass = req.query.documentClass;
    const where = klass ? { document_class: klass } : {};
    const { Op } = require('sequelize');
    where[Op.or] = [{ user_id: req.userId }, { is_built_in: true }];
    const { count, rows } = await DocumentTemplate.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      order: [['createdAt', 'DESC']],
    });
    res.json({
      data: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/templates */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, document_class, description, schema, prompt_overrides, post_processing, export_format } = req.body;
    if (!name || !schema) return res.status(400).json({ error: 'name and schema are required' });
    const tpl = await DocumentTemplate.create({
      user_id: req.userId,
      name,
      document_class,
      description,
      schema,
      prompt_overrides,
      post_processing: post_processing || [],
      export_format: export_format || 'json',
    });
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/templates/:id */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const tpl = await DocumentTemplate.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    await tpl.update(req.body);
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/templates/:id */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tpl = await DocumentTemplate.findOne({
      where: { id: req.params.id, user_id: req.userId },
    });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    await tpl.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/templates/:id/apply/:documentId
 * Run extraction with a template + post-processing rules.
 */
router.post('/:id/apply/:documentId', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const limit = aiRateLimiter(req.userId);
    if (!limit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', resetAt: limit.resetAt });
    }
    const tpl = await DocumentTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    const doc = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages'],
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const fullText = (doc.pages || [])
      .sort((a, b) => a.page_number - b.page_number)
      .map((p) => p.extracted_text || '')
      .join('\n\n');

    const prompt = `${tpl.prompt_overrides || `You extract structured data from ${tpl.document_class || 'document'}.`}

Return JSON matching this exact schema:
${JSON.stringify(tpl.schema, null, 2)}

Document content:
${fullText.slice(0, 60000)}`;

    const aiRes = await chat({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
      temperature: 0.1,
    });
    let extracted = parseAIJson(aiRes.content) || { _raw: aiRes.content };

    // Apply post-processing rules
    extracted = applyPostProcessing(extracted, tpl.post_processing || []);

    const job = await ProcessingJob.create({
      document_id: doc.id,
      job_type: 'analyze',
      status: 'completed',
      progress: 100,
      result: { extracted, templateId: tpl.id, exportFormat: tpl.export_format },
      completed_at: new Date(),
    });

    await logAIUsage({
      userId: req.userId,
      feature: 'template-apply',
      model: aiRes.model,
      input: { templateId: tpl.id, documentId: doc.id },
      output: { fields: Object.keys(extracted) },
      durationMs: Date.now() - start,
    });

    res.json({ success: true, jobId: job.id, extracted, exportFormat: tpl.export_format });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function applyPostProcessing(data, rules) {
  if (!Array.isArray(rules)) return data;
  for (const rule of rules) {
    const value = getByPath(data, rule.field);
    if (value === undefined) continue;
    let next = value;
    switch (rule.type) {
      case 'currency':
        next = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.\-]/g, '')) : value;
        break;
      case 'date':
        next = value ? new Date(value).toISOString() : null;
        break;
      case 'uppercase':
        next = String(value).toUpperCase();
        break;
      case 'lowercase':
        next = String(value).toLowerCase();
        break;
      case 'trim':
        next = String(value).trim();
        break;
      case 'replace':
        next = String(value).replace(new RegExp(rule.pattern, 'g'), rule.replacement || '');
        break;
    }
    setByPath(data, rule.field, next);
  }
  return data;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
  parent[last] = value;
}

module.exports = router;
