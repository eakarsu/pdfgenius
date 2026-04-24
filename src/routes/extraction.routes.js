const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const tableService = require('../services/table.service');
const formService = require('../services/form.service');
const queueService = require('../services/queue.service');
const { Document, ExtractedTable, FormField } = require('../models');

// ==================== TABLE EXTRACTION ROUTES ====================

/**
 * POST /api/extract/tables/:documentId
 * Extract tables from document
 */
router.post('/tables/:documentId', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    // Queue the extraction job
    const { async: asyncMode = false } = req.body;

    if (asyncMode) {
      const job = await queueService.addExtractionJob(document.id, 'extract_tables');
      return res.json({
        success: true,
        message: 'Table extraction queued',
        jobId: job.jobId
      });
    }

    // Synchronous extraction
    const tables = await tableService.extractTables(document.id);

    res.json({
      success: true,
      tablesCount: tables.length,
      tables
    });
  } catch (error) {
    console.error('Table extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/extract/tables/:documentId
 * Get extracted tables for document
 */
router.get('/tables/:documentId', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const tables = await tableService.getDocumentTables(document.id);

    res.json({
      success: true,
      document: {
        id: document.id,
        name: document.original_name
      },
      tablesCount: tables.length,
      tables
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      error: 'Failed to get tables',
      message: error.message
    });
  }
});

/**
 * GET /api/extract/tables/single/:tableId
 * Get single table by ID
 */
router.get('/tables/single/:tableId', authenticate, async (req, res) => {
  try {
    const table = await tableService.getTable(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Table not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: table.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this table'
      });
    }

    res.json({
      success: true,
      table
    });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({
      error: 'Failed to get table',
      message: error.message
    });
  }
});

/**
 * PUT /api/extract/tables/:tableId
 * Update table data
 */
router.put('/tables/:tableId', authenticate, async (req, res) => {
  try {
    const table = await ExtractedTable.findByPk(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Table not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: table.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const { headers, rows } = req.body;
    const updatedTable = await tableService.updateTable(table.id, { headers, rows });

    res.json({
      success: true,
      table: updatedTable
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * POST /api/extract/tables/:tableId/export
 * Export table to CSV or JSON
 */
router.post('/tables/:tableId/export', authenticate, async (req, res) => {
  try {
    const table = await ExtractedTable.findByPk(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Table not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: table.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const { format = 'csv' } = req.body;

    if (format === 'csv') {
      const csv = tableService.exportToCSV(table);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="table_${table.id}.csv"`);
      return res.send(csv);
    }

    if (format === 'json') {
      const json = tableService.exportToJSON(table);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="table_${table.id}.json"`);
      return res.json(json);
    }

    res.status(400).json({
      error: 'Invalid format',
      message: 'Supported formats: csv, json'
    });
  } catch (error) {
    console.error('Export table error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/extract/tables/:tableId
 * Delete extracted table
 */
router.delete('/tables/:tableId', authenticate, authorize('tables', 'delete'), async (req, res) => {
  try {
    const table = await ExtractedTable.findByPk(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Table not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: table.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await tableService.deleteTable(table.id);

    res.json({
      success: true,
      message: 'Table deleted'
    });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * POST /api/extract/tables/bulk-delete
 * Bulk delete extracted tables
 */
router.post('/tables/bulk-delete', authenticate, authorize('tables', 'delete'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ids array is required'
      });
    }

    // Verify ownership
    const tables = await ExtractedTable.findAll({ where: { id: ids } });
    for (const table of tables) {
      const doc = await Document.findOne({
        where: { id: table.document_id, user_id: req.userId }
      });
      if (!doc) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const deletedCount = await ExtractedTable.destroy({ where: { id: ids } });

    res.json({
      success: true,
      message: `${deletedCount} tables deleted`,
      deletedCount
    });
  } catch (error) {
    console.error('Bulk delete tables error:', error);
    res.status(500).json({ error: 'Bulk delete failed', message: error.message });
  }
});

// ==================== FORM EXTRACTION ROUTES ====================

/**
 * POST /api/extract/forms/:documentId
 * Extract form fields from document
 */
router.post('/forms/:documentId', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    // Queue the extraction job
    const { async: asyncMode = false } = req.body;

    if (asyncMode) {
      const job = await queueService.addExtractionJob(document.id, 'extract_forms');
      return res.json({
        success: true,
        message: 'Form extraction queued',
        jobId: job.jobId
      });
    }

    // Synchronous extraction
    const fields = await formService.extractFormFields(document.id);

    res.json({
      success: true,
      fieldsCount: fields.length,
      fields
    });
  } catch (error) {
    console.error('Form extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
});

/**
 * GET /api/extract/forms/:documentId
 * Get extracted form fields for document
 */
router.get('/forms/:documentId', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const fields = await formService.getDocumentFormFields(document.id);

    res.json({
      success: true,
      document: {
        id: document.id,
        name: document.original_name
      },
      fieldsCount: fields.length,
      fields
    });
  } catch (error) {
    console.error('Get form fields error:', error);
    res.status(500).json({
      error: 'Failed to get form fields',
      message: error.message
    });
  }
});

/**
 * PUT /api/extract/forms/:fieldId
 * Update form field value
 */
router.put('/forms/:fieldId', authenticate, async (req, res) => {
  try {
    const field = await FormField.findByPk(req.params.fieldId);

    if (!field) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Form field not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: field.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const updatedField = await formService.updateFormField(field.id, req.body);

    res.json({
      success: true,
      field: updatedField
    });
  } catch (error) {
    console.error('Update form field error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * POST /api/extract/forms/:documentId/export
 * Export form fields
 */
router.post('/forms/:documentId/export', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const fields = await formService.getDocumentFormFields(document.id);
    const { format = 'json' } = req.body;

    if (format === 'json') {
      const json = formService.exportToJSON(fields);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="form_fields_${document.id}.json"`);
      return res.json(json);
    }

    if (format === 'flat') {
      const flat = formService.exportToFlatJSON(fields);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="form_data_${document.id}.json"`);
      return res.json(flat);
    }

    if (format === 'csv') {
      const csv = formService.exportToCSV(fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="form_fields_${document.id}.csv"`);
      return res.send(csv);
    }

    res.status(400).json({
      error: 'Invalid format',
      message: 'Supported formats: json, flat, csv'
    });
  } catch (error) {
    console.error('Export form fields error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

/**
 * POST /api/extract/forms/bulk-delete
 * Bulk delete form fields
 */
router.post('/forms/bulk-delete', authenticate, authorize('forms', 'delete'), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ids array is required'
      });
    }

    // Verify ownership
    const fields = await FormField.findAll({ where: { id: ids } });
    for (const field of fields) {
      const doc = await Document.findOne({
        where: { id: field.document_id, user_id: req.userId }
      });
      if (!doc) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const deletedCount = await FormField.destroy({ where: { id: ids } });

    res.json({
      success: true,
      message: `${deletedCount} form fields deleted`,
      deletedCount
    });
  } catch (error) {
    console.error('Bulk delete forms error:', error);
    res.status(500).json({ error: 'Bulk delete failed', message: error.message });
  }
});

/**
 * POST /api/extract/forms/bulk-update
 * Bulk update form field values
 */
router.post('/forms/bulk-update', authenticate, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Updates must be an array'
      });
    }

    // Verify ownership of all fields
    for (const update of updates) {
      const field = await FormField.findByPk(update.id);
      if (field) {
        const doc = await Document.findOne({
          where: { id: field.document_id, user_id: req.userId }
        });
        if (!doc) {
          return res.status(403).json({
            error: 'Access denied',
            message: `No access to field ${update.id}`
          });
        }
      }
    }

    const results = await formService.bulkUpdateFields(updates);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      error: 'Bulk update failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/extract/forms/:fieldId
 * Delete form field
 */
router.delete('/forms/:fieldId', authenticate, authorize('forms', 'delete'), async (req, res) => {
  try {
    const field = await FormField.findByPk(req.params.fieldId);

    if (!field) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Form field not found'
      });
    }

    // Verify ownership
    const document = await Document.findOne({
      where: {
        id: field.document_id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await formService.deleteFormField(field.id);

    res.json({
      success: true,
      message: 'Form field deleted'
    });
  } catch (error) {
    console.error('Delete form field error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

module.exports = router;
