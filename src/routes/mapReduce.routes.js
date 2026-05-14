const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { aiRateLimiter, logAIUsage } = require('../utils/ai-helpers');
const { chunkAndSummarize, indexChunks } = require('../services/mapReduce.service');
const { Document, ProcessingJob } = require('../models');

/**
 * POST /api/map-reduce/summarize/:documentId
 * Replaces the 50k-char truncation with a chunk → per-chunk summary →
 * synthesis pipeline that returns page-anchor citations.
 */
router.post('/summarize/:documentId', authenticate, async (req, res) => {
  const start = Date.now();
  try {
    const limit = aiRateLimiter(req.userId);
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'AI rate limit exceeded',
        resetAt: limit.resetAt,
        limit: limit.limit,
      });
    }

    const doc = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const result = await chunkAndSummarize(doc.id, { model: req.body?.model });

    const job = await ProcessingJob.create({
      document_id: doc.id,
      job_type: 'summarize',
      status: 'completed',
      progress: 100,
      result: { ...result, mode: 'map-reduce' },
      completed_at: new Date(),
    });

    await logAIUsage({
      userId: req.userId,
      feature: 'map-reduce-summarize',
      model: result.model,
      input: { documentId: doc.id },
      output: { chunkCount: result.chunks.length },
      durationMs: Date.now() - start,
    });

    res.json({ success: true, jobId: job.id, ...result });
  } catch (err) {
    await logAIUsage({
      userId: req.userId,
      feature: 'map-reduce-summarize',
      error: err.message,
      durationMs: Date.now() - start,
    });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/map-reduce/index/:documentId
 * Compute embeddings for the document's chunks (RAG prerequisite).
 */
router.post('/index/:documentId', authenticate, async (req, res) => {
  try {
    const doc = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const result = await indexChunks(doc.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
