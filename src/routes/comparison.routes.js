const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const comparisonService = require('../services/comparison.service');
const { Document, Comparison } = require('../models');

/**
 * POST /api/compare
 * Compare two documents
 */
router.post('/', authenticate, authorize('comparisons', 'create'), async (req, res) => {
  try {
    const { documentAId, documentBId, comparisonType = 'text' } = req.body;

    // Validate input
    if (!documentAId || !documentBId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Both documentAId and documentBId are required'
      });
    }

    // Verify user owns both documents
    const [docA, docB] = await Promise.all([
      Document.findOne({ where: { id: documentAId, user_id: req.userId } }),
      Document.findOne({ where: { id: documentBId, user_id: req.userId } })
    ]);

    if (!docA || !docB) {
      return res.status(404).json({
        error: 'Not found',
        message: 'One or both documents not found'
      });
    }

    // Perform comparison
    const comparison = await comparisonService.compareDocuments(
      req.userId,
      documentAId,
      documentBId,
      comparisonType
    );

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      error: 'Comparison failed',
      message: error.message
    });
  }
});

/**
 * GET /api/compare/:id
 * Get comparison result
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const comparison = await Comparison.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      },
      include: [
        { association: 'documentA', attributes: ['id', 'original_name', 'total_pages', 'status'] },
        { association: 'documentB', attributes: ['id', 'original_name', 'total_pages', 'status'] }
      ]
    });

    if (!comparison) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Comparison not found'
      });
    }

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({
      error: 'Failed to get comparison',
      message: error.message
    });
  }
});

/**
 * GET /api/compare/history
 * Get user's comparison history
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Comparison.findAndCountAll({
      where: { user_id: req.userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        { association: 'documentA', attributes: ['id', 'original_name'] },
        { association: 'documentB', attributes: ['id', 'original_name'] }
      ]
    });

    res.json({
      success: true,
      comparisons: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Comparison history error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      message: error.message
    });
  }
});

/**
 * POST /api/compare/bulk-delete
 * Bulk delete comparisons
 */
router.post('/bulk-delete', authenticate, authorize('comparisons', 'delete'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ids array is required'
      });
    }

    const deletedCount = await Comparison.destroy({
      where: {
        id: ids,
        user_id: req.userId
      }
    });

    res.json({
      success: true,
      message: `${deletedCount} comparisons deleted`,
      deletedCount
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      error: 'Bulk delete failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/compare/:id
 * Delete comparison
 */
router.delete('/:id', authenticate, authorize('comparisons', 'delete'), async (req, res) => {
  try {
    const comparison = await Comparison.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!comparison) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Comparison not found'
      });
    }

    await comparison.destroy();

    res.json({
      success: true,
      message: 'Comparison deleted'
    });
  } catch (error) {
    console.error('Delete comparison error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * POST /api/compare/quick
 * Quick text comparison (without storing)
 */
router.post('/quick', authenticate, async (req, res) => {
  try {
    const { textA, textB } = req.body;

    if (!textA || !textB) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Both textA and textB are required'
      });
    }

    const { diffLines, diffWords } = require('diff');

    const lineDiff = diffLines(textA, textB);
    const wordDiff = diffWords(textA, textB);

    // Calculate similarity
    const totalChars = Math.max(textA.length, textB.length);
    let matchingChars = 0;

    for (const part of wordDiff) {
      if (!part.added && !part.removed) {
        matchingChars += part.value.length;
      }
    }

    const similarityScore = totalChars > 0 ? (matchingChars / totalChars) * 100 : 100;

    res.json({
      success: true,
      result: {
        similarityScore: Math.round(similarityScore * 100) / 100,
        differencesCount: lineDiff.filter(p => p.added || p.removed).length,
        lineDiff: lineDiff.slice(0, 100).map(part => ({
          value: part.value.substring(0, 500),
          type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
        }))
      }
    });
  } catch (error) {
    console.error('Quick comparison error:', error);
    res.status(500).json({
      error: 'Comparison failed',
      message: error.message
    });
  }
});

module.exports = router;
