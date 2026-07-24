'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

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
