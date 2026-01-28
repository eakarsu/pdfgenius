const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Document, DocumentPage, ProcessingJob } = require('../models');
const { authenticate } = require('../middleware/auth.middleware');
const storageService = require('../services/storage.service');
const queueService = require('../services/queue.service');
const documentService = require('./document.routes'); // Import existing service

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * GET /api/documents
 * List user's documents with pagination
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, sort = 'created_at', order = 'DESC' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = { user_id: req.userId };

    if (status) {
      where.status = status;
    }

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
    console.error('List documents error:', error);
    res.status(500).json({
      error: 'Failed to list documents',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/:id
 * Get document details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      },
      include: [
        { association: 'pages', order: [['page_number', 'ASC']] },
        { association: 'jobs', order: [['created_at', 'DESC']] },
        { association: 'tables', order: [['page_number', 'ASC']] },
        { association: 'formFields', order: [['page_number', 'ASC']] }
      ]
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      error: 'Failed to get document',
      message: error.message
    });
  }
});

/**
 * POST /api/documents
 * Upload new document
 */
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No file uploaded'
      });
    }

    const { processNow = false, model = 'openai/gpt-4o', customPrompt } = req.body;

    // Create document record
    const document = await Document.create({
      user_id: req.userId,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      status: 'pending',
      metadata: {
        uploadPath: req.file.path,
        processNow: processNow === 'true' || processNow === true,
        model,
        customPrompt
      }
    });

    // Upload to cloud storage
    try {
      const storagePath = storageService.generateStoragePath(req.file.originalname, `documents/${req.userId}`);
      await storageService.uploadFile(req.file.path, storagePath, req.file.mimetype);
      await document.update({ storage_path: storagePath });
    } catch (storageError) {
      console.log('Cloud storage not available, using local storage:', storageError.message);
    }

    // Add to processing queue if requested
    if (processNow === 'true' || processNow === true) {
      await queueService.addDocumentJob(document.id, 'convert', {
        model,
        customPrompt
      });
      await document.update({ status: 'processing' });
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/documents/:id
 * Update document metadata
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const allowedUpdates = ['original_name', 'metadata'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    await document.update(updates);

    res.json({
      success: true,
      message: 'Document updated',
      document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    // Delete from cloud storage
    if (document.storage_path) {
      try {
        await storageService.deleteFile(document.storage_path);
      } catch (err) {
        console.log('Could not delete from storage:', err.message);
      }
    }

    // Delete local file if exists
    if (document.metadata?.uploadPath && fs.existsSync(document.metadata.uploadPath)) {
      fs.unlinkSync(document.metadata.uploadPath);
    }

    // Delete document (cascades to pages, tables, form fields)
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * POST /api/documents/:id/process
 * Queue document for processing
 */
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const { model = 'openai/gpt-4o', customPrompt } = req.body;

    const job = await queueService.addDocumentJob(document.id, 'analyze', {
      model,
      customPrompt
    });

    await document.update({ status: 'processing' });

    res.json({
      success: true,
      message: 'Document queued for processing',
      jobId: job.jobId
    });
  } catch (error) {
    console.error('Process document error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/:id/download
 * Get download URL for document
 * Supports token in query param for iframe embedding
 */
router.get('/:id/download', async (req, res) => {
  try {
    // Support token from query param (for iframe) or header
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pdfgenius-secret-key');
      userId = decoded.id; // JWT uses 'id' not 'userId'
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const document = await Document.findOne({
      where: {
        id: req.params.id,
        user_id: userId
      }
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    // Check local file first
    if (document.metadata?.uploadPath) {
      // Resolve relative path to absolute
      const filePath = path.resolve(document.metadata.uploadPath);
      console.log('Checking file path:', filePath);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, document.original_name);
      }
    }

    // Try cloud storage
    if (document.storage_path) {
      try {
        const url = await storageService.getPresignedUrl(document.storage_path);
        return res.json({
          success: true,
          downloadUrl: url
        });
      } catch (err) {
        console.log('Cloud storage error:', err.message);
      }
    }

    res.status(404).json({
      error: 'Not found',
      message: 'File not available for download'
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/stats
 * Get document statistics for dashboard
 */
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const { Op } = require('sequelize');

    const [total, pending, processing, completed, failed] = await Promise.all([
      Document.count({ where: { user_id: req.userId } }),
      Document.count({ where: { user_id: req.userId, status: 'pending' } }),
      Document.count({ where: { user_id: req.userId, status: 'processing' } }),
      Document.count({ where: { user_id: req.userId, status: 'completed' } }),
      Document.count({ where: { user_id: req.userId, status: 'failed' } })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        processing,
        completed,
        failed
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

module.exports = router;
