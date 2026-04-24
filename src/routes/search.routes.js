const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { Document, Comparison, ExtractedTable, FormField } = require('../models');

/**
 * GET /api/search/documents
 * Search documents with filters
 */
router.get('/documents', authenticate, async (req, res) => {
  try {
    const {
      q, status, dateFrom, dateTo, mimeType,
      sort = 'created_at', order = 'DESC',
      page = 1, limit = 20
    } = req.query;

    const where = { user_id: req.userId };

    if (q) {
      where.original_name = { [Op.iLike]: `%${q}%` };
    }

    if (status) {
      where.status = status;
    }

    if (mimeType) {
      where.mime_type = mimeType;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Document.findAndCountAll({
      where,
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      include: [
        {
          association: 'pages',
          attributes: ['id', 'page_number', 'has_tables', 'has_forms']
        }
      ]
    });

    res.json({
      success: true,
      documents: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * GET /api/search/comparisons
 * Search comparisons
 */
router.get('/comparisons', authenticate, async (req, res) => {
  try {
    const { q, status, sort = 'created_at', order = 'DESC', page = 1, limit = 20 } = req.query;

    const where = { user_id: req.userId };

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Comparison.findAndCountAll({
      where,
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      include: [
        { association: 'documentA', attributes: ['id', 'original_name'] },
        { association: 'documentB', attributes: ['id', 'original_name'] }
      ]
    });

    // Filter by document name if q provided
    let filtered = rows;
    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = rows.filter(c =>
        c.documentA?.original_name?.toLowerCase().includes(lowerQ) ||
        c.documentB?.original_name?.toLowerCase().includes(lowerQ)
      );
    }

    res.json({
      success: true,
      comparisons: filtered,
      pagination: {
        total: q ? filtered.length : count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((q ? filtered.length : count) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search comparisons error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * GET /api/search/tables
 * Search extracted tables
 */
router.get('/tables', authenticate, async (req, res) => {
  try {
    const { q, sort = 'created_at', order = 'DESC', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user's document IDs
    const userDocs = await Document.findAll({
      where: { user_id: req.userId },
      attributes: ['id']
    });
    const docIds = userDocs.map(d => d.id);

    const where = { document_id: docIds };

    const { count, rows } = await ExtractedTable.findAndCountAll({
      where,
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      include: [{
        association: 'document',
        attributes: ['id', 'original_name']
      }]
    });

    res.json({
      success: true,
      tables: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search tables error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * GET /api/search/form-fields
 * Search form fields
 */
router.get('/form-fields', authenticate, async (req, res) => {
  try {
    const { q, fieldType, sort = 'created_at', order = 'DESC', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user's document IDs
    const userDocs = await Document.findAll({
      where: { user_id: req.userId },
      attributes: ['id']
    });
    const docIds = userDocs.map(d => d.id);

    const where = { document_id: docIds };

    if (q) {
      where[Op.or] = [
        { field_name: { [Op.iLike]: `%${q}%` } },
        { field_value: { [Op.iLike]: `%${q}%` } }
      ];
    }

    if (fieldType) {
      where.field_type = fieldType;
    }

    const { count, rows } = await FormField.findAndCountAll({
      where,
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      include: [{
        association: 'document',
        attributes: ['id', 'original_name']
      }]
    });

    res.json({
      success: true,
      fields: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search form fields error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * GET /api/search/documents/export
 * Export search results as CSV
 */
router.get('/documents/export', authenticate, async (req, res) => {
  try {
    const { q, status, dateFrom, dateTo, mimeType, format = 'csv' } = req.query;

    const where = { user_id: req.userId };

    if (q) where.original_name = { [Op.iLike]: `%${q}%` };
    if (status) where.status = status;
    if (mimeType) where.mime_type = mimeType;
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    const documents = await Document.findAll({
      where,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'original_name', 'file_size', 'mime_type', 'status', 'total_pages', 'created_at']
    });

    if (format === 'csv') {
      const headers = ['Name', 'Size', 'Type', 'Status', 'Pages', 'Created'];
      const rows = documents.map(d => [
        `"${d.original_name}"`,
        d.file_size,
        d.mime_type,
        d.status,
        d.total_pages || 0,
        d.created_at
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="documents_export.csv"');
      return res.send(csv);
    }

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
});

module.exports = router;
