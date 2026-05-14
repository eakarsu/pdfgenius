const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiRateLimiter, logAIUsage } = require('../utils/ai-helpers');
const { ask } = require('../services/rag.service');
const { RagChat, RagMessage, Document, DocumentChunk } = require('../models');
const { indexChunks } = require('../services/mapReduce.service');

/** GET /api/rag/chats — paginated list of user's chats */
router.get('/chats', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '20', 10);
    const { count, rows } = await RagChat.findAndCountAll({
      where: { user_id: req.userId },
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
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

/** POST /api/rag/chats — create a new chat with a list of document IDs */
router.post('/chats', authenticate, async (req, res) => {
  try {
    const { documentIds, title } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds required' });
    }
    // Validate ownership
    const owned = await Document.findAll({
      where: { id: documentIds, user_id: req.userId },
      attributes: ['id'],
    });
    if (owned.length !== documentIds.length) {
      return res.status(403).json({ error: 'You do not own all selected documents' });
    }

    // Auto-index any unindexed documents (best-effort)
    for (const id of documentIds) {
      const hasEmbeddings = await DocumentChunk.count({
        where: { document_id: id, embedding: { [require('sequelize').Op.ne]: null } },
      });
      if (hasEmbeddings === 0) {
        try { await indexChunks(id); } catch (e) { /* skip if no chunks */ }
      }
    }

    const chat = await RagChat.create({
      user_id: req.userId,
      document_ids: documentIds,
      title: title || `Chat ${new Date().toISOString()}`,
    });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/rag/chats/:id — chat with messages */
router.get('/chats/:id', authenticate, async (req, res) => {
  try {
    const chat = await RagChat.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: RagMessage, as: 'messages' }],
      order: [[{ model: RagMessage, as: 'messages' }, 'createdAt', 'ASC']],
    });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/rag/chats/:id/ask — send a question */
router.post('/chats/:id/ask', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const limit = aiRateLimiter(req.userId);
    if (!limit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded', resetAt: limit.resetAt });
    }
    const { question, model, topK } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const result = await ask(req.params.id, req.userId, question, { model, topK });

    await logAIUsage({
      userId: req.userId,
      feature: 'rag-ask',
      model: result.model,
      input: { question, chatId: req.params.id },
      output: { citationCount: result.citations.length },
      durationMs: Date.now() - start,
    });

    res.json(result);
  } catch (err) {
    await logAIUsage({
      userId: req.userId,
      feature: 'rag-ask',
      error: err.message,
      durationMs: Date.now() - start,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
