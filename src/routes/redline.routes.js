const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { Comparison, RedlineDecision } = require('../models');

/**
 * GET /api/redline/:comparisonId
 * Returns all per-clause decisions (auto-creates PENDING rows from the
 * comparison output if none exist yet).
 */
router.get('/:comparisonId', authenticate, async (req, res) => {
  try {
    const cmp = await Comparison.findOne({
      where: { id: req.params.comparisonId, user_id: req.userId },
    });
    if (!cmp) return res.status(404).json({ error: 'Comparison not found' });

    let decisions = await RedlineDecision.findAll({
      where: { comparison_id: cmp.id },
      order: [['createdAt', 'ASC']],
    });
    if (decisions.length === 0) {
      const result = cmp.result || {};
      const clauses = [];
      (result.modifiedContent || []).forEach((m, i) =>
        clauses.push({ key: `modifiedContent[${i}]` }),
      );
      (result.addedSections || []).forEach((m, i) =>
        clauses.push({ key: `addedSections[${i}]` }),
      );
      (result.removedSections || []).forEach((m, i) =>
        clauses.push({ key: `removedSections[${i}]` }),
      );
      if (clauses.length) {
        decisions = await Promise.all(
          clauses.map((c) =>
            RedlineDecision.create({
              comparison_id: cmp.id,
              clause_key: c.key,
              decision: 'PENDING',
            }),
          ),
        );
      }
    }
    res.json({ comparisonId: cmp.id, decisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/redline/:comparisonId/clauses/:clauseKey
 * Update one clause's accept/reject status.
 */
router.patch('/:comparisonId/clauses/:clauseKey', authenticate, async (req, res) => {
  try {
    const cmp = await Comparison.findOne({
      where: { id: req.params.comparisonId, user_id: req.userId },
    });
    if (!cmp) return res.status(404).json({ error: 'Comparison not found' });
    const { decision, rationale } = req.body;
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be ACCEPTED, REJECTED, or PENDING' });
    }
    const [row] = await RedlineDecision.upsert({
      comparison_id: cmp.id,
      clause_key: req.params.clauseKey,
      decision,
      decided_by: req.userId,
      decided_at: new Date(),
      rationale: rationale || null,
    });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/redline/:comparisonId/finalize
 * Build the merged result by applying ACCEPTED clauses on top of the
 * "from" document. Returns a JSON merged document the renderer can
 * convert into a clean PDF.
 */
router.post('/:comparisonId/finalize', authenticate, async (req, res) => {
  try {
    const cmp = await Comparison.findOne({
      where: { id: req.params.comparisonId, user_id: req.userId },
    });
    if (!cmp) return res.status(404).json({ error: 'Comparison not found' });

    const decisions = await RedlineDecision.findAll({ where: { comparison_id: cmp.id } });
    const acceptedKeys = new Set(decisions.filter((d) => d.decision === 'ACCEPTED').map((d) => d.clause_key));
    const result = cmp.result || {};

    const merged = {
      summary: result.summary || '',
      finalSections: [],
      acceptedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
    };

    (result.modifiedContent || []).forEach((m, i) => {
      const key = `modifiedContent[${i}]`;
      const accepted = acceptedKeys.has(key);
      merged.finalSections.push({
        heading: m.heading,
        text: accepted ? m.revised : m.original,
        change: accepted ? 'ACCEPTED' : 'REJECTED',
      });
    });
    (result.addedSections || []).forEach((m, i) => {
      const key = `addedSections[${i}]`;
      if (acceptedKeys.has(key)) {
        merged.finalSections.push({ heading: m.heading || `Added ${i + 1}`, text: m.text || m, change: 'ADDED' });
      }
    });

    decisions.forEach((d) => {
      if (d.decision === 'ACCEPTED') merged.acceptedCount++;
      else if (d.decision === 'REJECTED') merged.rejectedCount++;
      else merged.pendingCount++;
    });

    res.json({ comparisonId: cmp.id, merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
