#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function fail(message) {
  process.stderr.write(`prototype-boundary: ${message}\n`);
  process.exit(1);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function requireFile(relative) {
  const target = path.join(root, relative);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${relative} must be a regular file`);
}

const required = [
  'README.md',
  'PROJECT_STATUS.json',
  'SECURITY.md',
  'OPERATIONS.md',
  'vite.config.mjs',
  '.env.example',
  '_COMPLETENESS_REVIEW.md',
  '.github/workflows/prototype-boundary.yml',
  'scripts/assert-local-prototype.js',
  'scripts/blocked-operation.js',
  'scripts/check-audit-baseline.js',
  'scripts/security-audit.sh',
  'scripts/verify-prototype-boundary.js',
  'tests/prototype-boundary.test.js',
  'tests/prototype-data-policy.test.js',
  'tests/runtime-policy.test.js',
  'tests/upload-validation.test.js',
];
for (const relative of required) requireFile(relative);

const status = JSON.parse(read('PROJECT_STATUS.json'));
const expectedStatus = {
  schema_version: 1,
  project: 'pdfgenius',
  classification: 'unsupported-local-prototype',
  decision: 'retain-local-prototype-quarantine',
  production_supported: false,
  deployment_allowed: false,
  real_data_allowed: false,
};
for (const [key, value] of Object.entries(expectedStatus)) {
  if (status[key] !== value) fail(`PROJECT_STATUS.json ${key} must remain ${JSON.stringify(value)}`);
}
if (status.product_owner !== null || status.security_patch_owner !== null) {
  fail('unsupported ownership fields must remain explicitly unassigned');
}
if (status.dependency_audit_baseline?.critical !== 0 ||
    status.dependency_audit_baseline?.total !== 4) {
  fail('dependency audit baseline metadata drifted');
}

const packageJson = JSON.parse(read('package.json'));
for (const dependency of [
  'bull',
  '@babel/plugin-proposal-private-property-in-object',
  '@fortawesome/fontawesome-free',
  '@react-pdf/renderer',
  'axios',
  'cra-template',
  'diff',
  'fs-extra',
  'jszip',
  'pdf2pic',
  'pdfjs-dist',
  'react-code-blocks',
  'react-markdown',
  'react-pdf',
  'react-scripts',
  'tesseract.js',
  'web-vitals',
]) {
  if (packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency]) {
    fail(`retired dependency is present: ${dependency}`);
  }
}
const scripts = packageJson.scripts || {};
for (const hook of ['prestart', 'preserver', 'predev', 'prepreview']) {
  if (scripts[hook] !== 'node scripts/assert-local-prototype.js') {
    fail(`${hook} must enforce the local prototype boundary`);
  }
}
if (!scripts.test?.startsWith('node --test ') || scripts.seed !== 'node scripts/blocked-operation.js seed' ||
    scripts['db:sync'] !== 'node scripts/blocked-operation.js db:sync') {
  fail('test or destructive-operation scripts do not match the boundary');
}

for (const removed of [
  'yarn.lock',
  'vite.config.js',
  'src/App.test.js',
  'public/pdf.worker.min.js',
  'public/pdf.worker.min.mjs',
  'public/_redirects',
  'public/googleca3a85293ea395fe.html',
  'public/index.html',
  'public/legal/PrivacyPolicy.md',
  'public/legal/TermsAndConditions.md',
  'public/manifest.json',
  'public/robots.txt',
  'src/components/GapFeaturePage.jsx',
  'src/components/PDFConverter/index.js',
  'src/gap-pages.manifest.js',
  'src/pages/CodexCustomVizFeature.jsx',
  'src/pages/CodexOperationsFeature.jsx',
  'src/pages/TimelineView.jsx',
  'src/pages/APIDocumentation/index.js',
  'src/routes/aiExtras.routes.js',
  'src/routes/document.routes.js',
  'src/routes/gap-features.js',
  'src/middleware/upload.middleware.js',
  'src/pages/Signup/index.js',
  'src/pages/Signup/Auth.css',
  'src/reportWebVitals.js',
  'src/seeds/seed.js',
  'src/utils/pdfExport.util.js',
]) {
  if (fs.existsSync(path.join(root, removed))) fail(`retired file is present: ${removed}`);
}

const server = read('server.js');
const productionGuardIndex = server.indexOf("if (process.env.NODE_ENV === 'production')");
const dotenvIndex = server.indexOf("require('dotenv').config()");
const guardIndex = server.indexOf('assertLocalPrototypeRuntime();');
const expressIndex = server.indexOf("require('express')");
const databaseIndex = server.indexOf("require('./src/config/database')");
if (productionGuardIndex < 0 || dotenvIndex < 0 || guardIndex < 0 || expressIndex < 0 || databaseIndex < 0 ||
    productionGuardIndex > dotenvIndex || dotenvIndex > guardIndex || guardIndex > expressIndex ||
    expressIndex > databaseIndex) {
  fail('server runtime guards must execute before third-party application/database initialization');
}
if (server.includes('sequelize.sync')) {
  fail('server must not alter database schema');
}
if (!server.includes("const HOST = '127.0.0.1'") || !server.includes('app.listen(PORT, HOST')) {
  fail('local prototype server must bind only to loopback');
}
for (const mount of ['gap-features', "app.use('/api/ai-extras'", "app.use('/api', documentRoutes)"]) {
  if (server.includes(mount)) fail(`unsupported route is mounted: ${mount}`);
}
const apiMounts = [...server.matchAll(/app\.use\('(\/api[^']*)'/g)].map((match) => match[1]);
if (JSON.stringify(apiMounts) !== JSON.stringify(['/api/auth', '/api/documents'])) {
  fail(`server route boundary widened: ${apiMounts.join(', ')}`);
}

const rbac = read('src/middleware/rbac.middleware.js');
if (!rbac.includes('cache[key] !== true') || rbac.includes('next(); // Fail open') ||
    rbac.includes('return permissionCache || {}') || rbac.includes("userRole === 'admin'")) {
  fail('RBAC is not fail closed');
}

const documents = read('src/routes/documents.routes.js');
const documentRoutes = [...documents.matchAll(/router\.(get|post|delete|put)\('([^']+)'/g)]
  .map((match) => `${match[1].toUpperCase()} ${match[2]}`);
const expectedDocumentRoutes = [
  'GET /',
  'GET /stats/overview',
  'GET /:id',
  'POST /',
  'DELETE /:id',
  'POST /bulk-delete',
  'POST /bulk-update',
  'POST /:id/process',
  'GET /:id/download',
];
if (JSON.stringify(documentRoutes) !== JSON.stringify(expectedDocumentRoutes)) {
  fail(`document route boundary widened: ${documentRoutes.join(', ')}`);
}
for (const control of [
  "router.get('/:id/download', authenticate",
  'validateStagedPdf(req.file)',
  "error: 'Processing disabled'",
  "error: 'Bulk delete disabled'",
  "error: 'Integrity check failed'",
]) {
  if (!documents.includes(control)) fail(`document boundary control missing: ${control}`);
}
if (documents.includes('req.query.token') || documents.includes("'pdfgenius-secret-key'")) {
  fail('document download contains an unsafe token path or secret fallback');
}
const publicAttributes = documents.match(/const PUBLIC_DOCUMENT_ATTRIBUTES = \[[\s\S]*?\];/)?.[0] || '';
if (!publicAttributes || publicAttributes.includes('storage_path') || !documents.includes('document: publicDocument(document)')) {
  fail('document responses do not enforce the public metadata allowlist');
}
if (!documents.includes('documents: rows.map(publicDocument)') ||
    !documents.includes('getFileBuffer(document.storage_path, MAX_PDF_BYTES)')) {
  fail('document listing or bounded download control is missing');
}

const storage = read('src/services/storage.service.js');
if (!storage.includes('deletion requires reconciliation') || !storage.includes('new HeadObjectCommand') ||
    !storage.includes('Stored object exceeds the download size boundary')) {
  fail('storage read/deletion does not fail closed for oversized or missing local/cloud objects');
}

const app = read('src/App.js');
if (/Gap[A-Z]|CodexCustomVizFeature|CodexOperationsFeature|TimelineView/.test(app)) {
  fail('generated mock pages remain mounted in the frontend');
}
const frontendRoutes = [...app.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]);
const expectedFrontendRoutes = ['/', '/login', '/documents', '/documents/:id', '/dashboard', '*'];
if (JSON.stringify(frontendRoutes) !== JSON.stringify(expectedFrontendRoutes)) {
  fail(`frontend route boundary widened: ${frontendRoutes.join(', ')}`);
}
const home = read('src/pages/Home/index.js');
if (!home.includes('Unsupported, synthetic-data-only evaluation') ||
    /99% Accuracy|Start Free Trial|View Pricing|AI PDF Extraction/.test(home)) {
  fail('home page does not represent the prototype quarantine accurately');
}
const authRoutes = read('src/routes/auth.routes.js');
for (const marker of [
  "error: 'Account provisioning unavailable'",
  "error: 'Profile mutation unavailable'",
  "error: 'Password mutation unavailable'",
]) {
  if (!authRoutes.includes(marker)) fail(`account lifecycle boundary missing: ${marker}`);
}
const authContext = read('src/components/AuthContext/index.js');
if (/\/api\/auth\/(signup|profile)/.test(authContext) || /\bsignup\s*,/.test(authContext)) {
  fail('frontend auth context exposes unsupported account lifecycle operations');
}
const dataPolicy = read('src/config/prototype-data-policy.js');
if (!dataPolicy.includes('\\.invalid$') || !dataPolicy.includes('value.length > 128')) {
  fail('synthetic identity and bounded credential policy is missing');
}
const rootIndex = read('index.html');
if (!rootIndex.includes('Content-Security-Policy') || /https:\/\//.test(rootIndex)) {
  fail('frontend shell permits an external asset dependency or lacks its local CSP');
}

for (const activeModule of [
  'src/middleware/auth.middleware.js',
  'src/middleware/rbac.middleware.js',
  'src/routes/documents.routes.js',
  'src/services/auth.service.js',
]) {
  if (/require\(['"]\.\.\/models['"]\)/.test(read(activeModule))) {
    fail(`${activeModule} loads the unsupported aggregate model graph`);
  }
}

const forbiddenSourcePatterns = [
  'pdfgenius-secret-key',
  'minioadmin',
  'pdfgenius123',
  'demo123',
  'admin123',
];
const sourceFiles = [
  'server.js',
  'src/config/database.js',
  'src/services/auth.service.js',
  'src/services/storage.service.js',
  'src/pages/Login/index.js',
];
for (const relative of sourceFiles) {
  const content = read(relative);
  for (const pattern of forbiddenSourcePatterns) {
    if (content.includes(pattern)) fail(`${relative} contains forbidden fallback/demo credential material`);
  }
}

for (const script of ['start.sh', 'start-local.sh', 'docker.run.sh']) {
  const content = read(script);
  for (const operation of ['kill -9', 'createdb ', 'sequelize.sync', 'yarn install', 'npm install']) {
    if (content.includes(operation)) fail(`${script} contains destructive/implicit operation: ${operation}`);
  }
}

const dockerfile = read('Dockerfile');
if (/^\s*(CMD|ENTRYPOINT|EXPOSE)\b/m.test(dockerfile) || /COPY\s+\.\s+/m.test(dockerfile)) {
  fail('Dockerfile became runnable or copied application source');
}
if (!read('genezio.yaml').includes('deployment: disabled')) fail('Genezio deployment is not disabled');
if (/^\s*(listen|proxy_pass|server_name)\b/m.test(read('nginx.txt'))) fail('Nginx deployment directives returned');

const progressMatches = read('_COMPLETENESS_REVIEW.md').match(/^## Implementation progress$/gm) || [];
if (progressMatches.length !== 1) fail('review must contain exactly one implementation-progress section');

try {
  const trackedEnv = execFileSync('git', ['-C', root, 'ls-files', '--', '.env'], { encoding: 'utf8' }).trim();
  if (trackedEnv) fail('.env is tracked');
  execFileSync('git', ['-C', root, 'check-ignore', '-q', '.env']);
} catch (error) {
  if (error.status === 1) fail('.env is not covered by ignore policy');
  throw error;
}

process.stdout.write('prototype-boundary: verified local-only quarantine\n');
