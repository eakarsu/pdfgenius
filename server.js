// server.js
const { assertLocalPrototypeRuntime } = require('./src/config/prototype-boundary');

// Refuse production execution before loading any third-party runtime module.
// Local evaluation may load values from .env, then must pass the same guard.
if (process.env.NODE_ENV === 'production') {
  assertLocalPrototypeRuntime(process.env);
}
require('dotenv').config();

// Refuse accidental execution unless the operator explicitly acknowledges that
// this repository is an unsupported, local-only prototype.
assertLocalPrototypeRuntime();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import database
const { sequelize, testConnection } = require('./src/config/database');

// Narrow retained route boundary
const authRoutes = require('./src/routes/auth.routes');
const documentsRoutes = require('./src/routes/documents.routes');
const { rateLimit } = require('./src/middleware/auth.middleware');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// CORS origins have already been restricted to explicit loopback origins by the
// local-prototype runtime guard.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl / health checks
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api/auth', rateLimit({ windowMs: 60000, max: 20 }), authRoutes);
app.use('/api/documents', documentsRoutes); // Narrow PDF retention path

// Health endpoint reports only the dependency used by the retained path.
app.get('/api/health', async (req, res) => {
  const out = { status: 'ok', timestamp: new Date().toISOString(), checks: {} };
  try {
    await sequelize.authenticate();
    out.checks.db = 'ok';
  } catch (e) { out.checks.db = 'error'; out.status = 'degraded'; }
  res.status(out.status === 'ok' ? 200 : 503).json(out);
});

// Error handling middleware
app.use((error, req, res, next) => {
  const multer = require('multer');

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }

  if (error.code === 'UNSUPPORTED_FILE_TYPE' || error.code === 'INVALID_PDF') {
    return res.status(400).json({ error: error.message });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*catchall', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;
const HOST = '127.0.0.1';

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) throw new Error('Disposable database connection is required');

    // Schema creation/alteration is intentionally absent. A reviewer must supply
    // an already prepared disposable schema; no migration chain is claimed.
    await sequelize.authenticate();

    // Generated gap/demo routes are intentionally not mounted.
    app.listen(PORT, HOST, () => {
      console.log(`\n========================================`);
      console.log(`   PDFGenius local prototype on http://${HOST}:${PORT}`);
      console.log(`========================================\n`);
      console.log('Available endpoints:');
      console.log('  Authentication:');
      console.log('    POST /api/auth/login     - Login');
      console.log('    POST /api/auth/signup    - Register');
      console.log('    GET  /api/auth/me        - Current user');
      console.log('  Documents:');
      console.log('    GET  /api/documents      - List documents');
      console.log('    POST /api/documents      - Upload document');
      console.log('    GET  /api/documents/:id  - Get document');
      console.log('  Health:');
      console.log('    GET  /api/health         - Health check');
    });
  } catch (error) {
    console.error('Failed to start the local prototype:', error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await sequelize.close();
  process.exit(0);
});
