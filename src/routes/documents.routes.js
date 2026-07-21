const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const Document = require('../models/Document');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const storageService = require('../services/storage.service');
const {
  MAX_PDF_BYTES,
  normalizePdfDisplayName,
  validateStagedPdf,
} = require('../services/upload-validation.service');

const PUBLIC_DOCUMENT_ATTRIBUTES = [
  'id',
  'original_name',
  'file_size',
  'mime_type',
  'metadata',
  'created_at',
  'updated_at',
];

function publicDocument(document) {
  const value = document.toJSON();
  const result = Object.fromEntries(
    PUBLIC_DOCUMENT_ATTRIBUTES
      .filter((attribute) => Object.prototype.hasOwnProperty.call(value, attribute))
      .map((attribute) => [attribute, value[attribute]]),
  );
  const provenance = value.metadata?.provenance;
  result.metadata = provenance ? {
    version: value.metadata.version === 1 ? 1 : null,
    provenance: {
      sha256: typeof provenance.sha256 === 'string' && /^[a-f0-9]{64}$/.test(provenance.sha256)
        ? provenance.sha256
        : null,
      byteLength: Number.isSafeInteger(provenance.byteLength) ? provenance.byteLength : null,
      format: provenance.format === 'pdf' ? 'pdf' : null,
      validationPolicyVersion: Number.isSafeInteger(provenance.validationPolicyVersion)
        ? provenance.validationPolicyVersion
        : null,
      malwareScan: provenance.malwareScan?.result === 'clean'
        ? { result: 'clean' }
        : null,
      validatedAt: typeof provenance.validatedAt === 'string' ? provenance.validatedAt : null,
    },
  } : { version: null, provenance: null };
  return result;
}

async function removeStagedFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

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
    cb(null, `${uuidv4()}.pdf`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      const error = new Error('Only PDF uploads are accepted');
      error.code = 'INVALID_PDF';
      cb(error);
    }
  }
});

/**
 * GET /api/documents
 * List user's documents with pagination
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;
    const allowedSorts = new Set(['created_at', 'updated_at', 'original_name', 'file_size']);
    const sort = allowedSorts.has(req.query.sort) ? req.query.sort : 'created_at';
    const order = String(req.query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    const where = { user_id: req.userId };

    if (req.query.q) {
      where.original_name = { [Op.iLike]: `%${String(req.query.q).slice(0, 200)}%` };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.created_at = {};
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
      if (dateFrom && !Number.isNaN(dateFrom.getTime())) where.created_at[Op.gte] = dateFrom;
      if (dateTo && !Number.isNaN(dateTo.getTime())) where.created_at[Op.lte] = dateTo;
    }

    const { count, rows } = await Document.findAndCountAll({
      attributes: PUBLIC_DOCUMENT_ATTRIBUTES,
      where,
      order: [[sort, order]],
      limit,
      offset,
    });

    res.json({
      success: true,
      documents: rows.map(publicDocument),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      error: 'Failed to list documents',
      message: 'Document list is unavailable'
    });
  }
});

/**
 * GET /api/documents/stats/overview
 * Get tenant-scoped document statistics for the dashboard. This static route
 * must be declared before /:id so Express does not interpret "stats" as an id.
 */
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const total = await Document.count({ where: { user_id: req.userId } });

    res.json({
      success: true,
      stats: { total }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'Document statistics are unavailable'
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
      attributes: PUBLIC_DOCUMENT_ATTRIBUTES,
      where: {
        id: req.params.id,
        user_id: req.userId
      },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      document: publicDocument(document)
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      error: 'Failed to get document',
      message: 'Document details are unavailable'
    });
  }
});

/**
 * POST /api/documents
 * Upload new document
 */
router.post('/', authenticate, authorize('documents', 'create'), upload.single('file'), async (req, res) => {
  let storagePath = null;
  let document = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No file uploaded'
      });
    }

    if (req.body.processNow === 'true' || req.body.processNow === true) {
      await removeStagedFile(req.file.path);
      return res.status(409).json({
        error: 'Processing disabled',
        message: 'AI/OCR processing is outside the retained prototype boundary'
      });
    }

    const validation = await validateStagedPdf(req.file);
    const originalName = normalizePdfDisplayName(req.file.originalname);
    storagePath = storageService.generateStoragePath(originalName, `documents/${req.userId}`);
    await storageService.uploadFile(req.file.path, storagePath, req.file.mimetype);

    document = await Document.create({
      user_id: req.userId,
      original_name: originalName,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      storage_path: storagePath,
      status: 'pending',
      metadata: {
        version: 1,
        provenance: {
          sha256: validation.sha256,
          byteLength: validation.size,
          format: validation.format,
          validationPolicyVersion: validation.policyVersion,
          malwareScan: validation.malwareScan,
          validatedAt: validation.validatedAt
        }
      }
    });

    try {
      await removeStagedFile(req.file.path);
    } catch (cleanupError) {
      console.error('Upload staging cleanup failed:', cleanupError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Validated PDF retained successfully',
      document: publicDocument(document)
    });
  } catch (error) {
    console.error('Upload document error:', error);

    try { await removeStagedFile(req.file?.path); } catch (cleanupError) {
      console.error('Upload staging cleanup failed:', cleanupError.message);
    }
    if (!document && storagePath) {
      try { await storageService.deleteFile(storagePath); } catch (cleanupError) {
        console.error('Stored upload cleanup failed:', cleanupError.message);
      }
    }

    const statusByCode = {
      INVALID_PDF: 400,
      FILE_TOO_LARGE: 400,
      UNSAFE_PDF_FEATURE: 422,
      MALWARE_DETECTED: 422,
      MALWARE_SCANNER_UNAVAILABLE: 503,
      MALWARE_SCANNER_ERROR: 503
    };
    const status = statusByCode[error.code] || 500;
    res.status(status).json({
      error: 'Upload failed',
      message: status === 500 ? 'The upload could not be retained' : error.message
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document
 */
router.delete('/:id', authenticate, authorize('documents', 'delete'), async (req, res) => {
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

    if (!document.storage_path) {
      return res.status(409).json({
        error: 'Deletion blocked',
        message: 'Storage provenance is missing; no database record was removed'
      });
    }

    // Fail closed: keep the database record if storage deletion fails so the
    // storage reference is available for reconciliation and retry.
    await storageService.deleteFile(document.storage_path);
    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: 'Storage and database deletion did not both complete; the record was retained when possible'
    });
  }
});

/**
 * POST /api/documents/bulk-delete
 * Bulk delete documents
 */
router.post('/bulk-delete', authenticate, authorize('documents', 'delete'), async (req, res) => {
  res.status(409).json({
    error: 'Bulk delete disabled',
    message: 'Use individual deletion so each storage/database result is explicit'
  });
});

/**
 * POST /api/documents/bulk-update
 * Bulk update document status
 */
router.post('/bulk-update', authenticate, authorize('documents', 'update'), async (req, res) => {
  res.status(409).json({
    error: 'Bulk update disabled',
    message: 'Status and provenance metadata are server-managed and immutable'
  });
});

/**
 * POST /api/documents/:id/process
 * Queue document for processing
 */
router.post('/:id/process', authenticate, async (req, res) => {
  res.status(409).json({
    error: 'Processing disabled',
    message: 'AI/OCR processing has no supported provenance and evaluation contract'
  });
});

/**
 * GET /api/documents/:id/download
 * Get download URL for document
 * Requires a bearer token in the Authorization header. Query-string tokens are
 * intentionally rejected because URLs are commonly retained in logs/history.
 */
router.get('/:id/download', authenticate, async (req, res) => {
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

    if (!document.storage_path) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Stored file is unavailable'
      });
    }

    let downloadName;
    try {
      downloadName = normalizePdfDisplayName(document.original_name);
    } catch (error) {
      return res.status(409).json({
        error: 'Metadata validation failed',
        message: 'Stored PDF filename does not satisfy the retained boundary'
      });
    }

    const buffer = await storageService.getFileBuffer(document.storage_path, MAX_PDF_BYTES);
    const expectedDigest = document.metadata?.provenance?.sha256;
    const actualDigest = crypto.createHash('sha256').update(buffer).digest('hex');
    if (!expectedDigest || actualDigest !== expectedDigest) {
      return res.status(409).json({
        error: 'Integrity check failed',
        message: 'Stored PDF does not match its upload provenance'
      });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.type('application/pdf');
    res.attachment(downloadName);
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'The stored PDF could not be retrieved'
    });
  }
});

module.exports = router;
