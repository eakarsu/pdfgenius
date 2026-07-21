'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const BLOCKED_PDF_FEATURES = [
  ['/Encrypt', 'Encrypted PDFs are not accepted'],
  ['/JavaScript', 'PDF JavaScript is not accepted'],
  ['/JS', 'PDF JavaScript actions are not accepted'],
  ['/Launch', 'PDF launch actions are not accepted'],
  ['/OpenAction', 'PDF open actions are not accepted'],
  ['/EmbeddedFile', 'Embedded files are not accepted'],
];

class UploadValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UploadValidationError';
    this.code = code;
  }
}

function normalizePdfDisplayName(value) {
  if (typeof value !== 'string') {
    throw new UploadValidationError('INVALID_PDF', 'A PDF filename is required');
  }
  const name = value.trim();
  if (name.length === 0 || name.length > 255 || !name.toLowerCase().endsWith('.pdf') ||
      /[\/\\\u0000-\u001f\u007f]/.test(name) || path.basename(name) !== name) {
    throw new UploadValidationError(
      'INVALID_PDF',
      'PDF filename must be a plain filename without paths or control characters',
    );
  }
  return name;
}

function inspectPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new UploadValidationError('INVALID_PDF', 'The uploaded file is empty');
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new UploadValidationError('FILE_TOO_LARGE', 'PDF exceeds the 50 MB limit');
  }
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new UploadValidationError('INVALID_PDF', 'File content does not have a PDF header');
  }

  const trailer = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('latin1');
  if (!trailer.includes('%%EOF')) {
    throw new UploadValidationError('INVALID_PDF', 'PDF end-of-file marker is missing');
  }

  const content = buffer.toString('latin1');
  for (const [marker, message] of BLOCKED_PDF_FEATURES) {
    if (content.includes(marker)) {
      throw new UploadValidationError('UNSAFE_PDF_FEATURE', message);
    }
  }

  return {
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    size: buffer.length,
    format: 'pdf',
    policyVersion: 1,
  };
}

async function scanWithClamAv(filePath, env = process.env) {
  const command = env.CLAMAV_COMMAND;
  const allowedCommands = new Set(['clamscan', 'clamdscan']);
  if (!command || !allowedCommands.has(path.basename(command))) {
    throw new UploadValidationError(
      'MALWARE_SCANNER_UNAVAILABLE',
      'A configured clamscan or clamdscan executable is required before upload',
    );
  }

  try {
    await execFileAsync(command, ['--no-summary', '--', filePath], {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    return { engine: path.basename(command), result: 'clean' };
  } catch (error) {
    if (error.code === 1) {
      throw new UploadValidationError('MALWARE_DETECTED', 'The uploaded file failed malware scanning');
    }
    throw new UploadValidationError('MALWARE_SCANNER_ERROR', 'Malware scanning did not complete');
  }
}

async function validateStagedPdf(file, options = {}) {
  if (!file?.path) {
    throw new UploadValidationError('INVALID_PDF', 'Upload staging path is required');
  }
  normalizePdfDisplayName(file.originalname);
  if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
    throw new UploadValidationError('INVALID_PDF', 'Only files with a .pdf extension are accepted');
  }
  if (file.mimetype !== 'application/pdf') {
    throw new UploadValidationError('INVALID_PDF', 'PDF MIME type is required');
  }

  const stat = await fs.promises.lstat(file.path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new UploadValidationError('INVALID_PDF', 'Upload staging path is not a regular file');
  }
  if (stat.size > MAX_PDF_BYTES) {
    throw new UploadValidationError('FILE_TOO_LARGE', 'PDF exceeds the 50 MB limit');
  }

  const buffer = await fs.promises.readFile(file.path);
  const inspection = inspectPdfBuffer(buffer);
  const scan = await (options.scanFile || scanWithClamAv)(file.path, options.env || process.env);

  if (!scan || scan.result !== 'clean') {
    throw new UploadValidationError('MALWARE_SCANNER_ERROR', 'Malware scanner returned no clean result');
  }

  return {
    ...inspection,
    malwareScan: scan,
    validatedAt: new Date().toISOString(),
  };
}

module.exports = {
  BLOCKED_PDF_FEATURES,
  MAX_PDF_BYTES,
  UploadValidationError,
  inspectPdfBuffer,
  normalizePdfDisplayName,
  scanWithClamAv,
  validateStagedPdf,
};
