const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { AIUsageLog } = require('../models');
const { Op, Sequelize } = require('sequelize');

/**
 * GET /api/ai-usage?days=30&page=1&pageSize=50
 * Per-user AI usage log + per-feature aggregate.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '50', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = { user_id: req.userId, createdAt: { [Op.gte]: since } };
    const { count, rows } = await AIUsageLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const byFeature = await AIUsageLog.findAll({
      where,
      attributes: [
        'feature',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'calls'],
        [Sequelize.fn('SUM', Sequelize.col('cost_usd')), 'cost'],
        [Sequelize.fn('SUM', Sequelize.col('tokens_in')), 'tokensIn'],
        [Sequelize.fn('SUM', Sequelize.col('tokens_out')), 'tokensOut'],
      ],
      group: ['feature'],
      raw: true,
    });

    const totalCost = byFeature.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);

    res.json({
      data: rows,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
      byFeature,
      totalCostUsd: totalCost,
      windowDays: days,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
