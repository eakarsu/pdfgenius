'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  UploadValidationError,
  inspectPdfBuffer,
  normalizePdfDisplayName,
  validateStagedPdf,
} = require('../src/services/upload-validation.service');

test('accepts only plain bounded PDF display names', () => {
  assert.equal(normalizePdfDisplayName('Synthetic report.pdf'), 'Synthetic report.pdf');
  for (const name of ['../report.pdf', '..\\report.pdf', 'report.txt', 'bad\nname.pdf', 'a'.repeat(252) + '.pdf']) {
    assert.throws(() => normalizePdfDisplayName(name), UploadValidationError);
  }
});

function pdf(body = '1 0 obj\n<< /Type /Catalog >>\nendobj') {
  return Buffer.from(`%PDF-1.7\n${body}\n%%EOF\n`, 'latin1');
}

test('accepts a minimal inert PDF and records deterministic provenance', () => {
  const first = inspectPdfBuffer(pdf());
  const second = inspectPdfBuffer(pdf());
  assert.equal(first.format, 'pdf');
  assert.equal(first.policyVersion, 1);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.sha256, second.sha256);
});

for (const [name, content, code] of [
  ['empty input', Buffer.alloc(0), 'INVALID_PDF'],
  ['non-PDF header', Buffer.from('not a pdf\n%%EOF'), 'INVALID_PDF'],
  ['missing EOF marker', Buffer.from('%PDF-1.7\nbody'), 'INVALID_PDF'],
  ['encryption', pdf('trailer << /Encrypt 2 0 R >>'), 'UNSAFE_PDF_FEATURE'],
  ['JavaScript action', pdf('<< /JavaScript (alert) >>'), 'UNSAFE_PDF_FEATURE'],
  ['embedded file', pdf('<< /Type /EmbeddedFile >>'), 'UNSAFE_PDF_FEATURE'],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => inspectPdfBuffer(content),
      (error) => error instanceof UploadValidationError && error.code === code,
    );
  });
}

test('requires MIME, extension, regular file, and a clean malware scan', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfgenius-upload-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'sample.pdf');
  fs.writeFileSync(filePath, pdf());

  const result = await validateStagedPdf(
    { path: filePath, originalname: 'sample.pdf', mimetype: 'application/pdf' },
    { scanFile: async () => ({ engine: 'test-scanner', result: 'clean' }) },
  );
  assert.equal(result.malwareScan.result, 'clean');

  await assert.rejects(
    validateStagedPdf(
      { path: filePath, originalname: 'sample.txt', mimetype: 'application/pdf' },
      { scanFile: async () => ({ result: 'clean' }) },
    ),
    (error) => error.code === 'INVALID_PDF',
  );

  await assert.rejects(
    validateStagedPdf(
      { path: filePath, originalname: 'sample.pdf', mimetype: 'application/pdf' },
      { scanFile: async () => ({ result: 'infected' }) },
    ),
    (error) => error.code === 'MALWARE_SCANNER_ERROR',
  );
});
