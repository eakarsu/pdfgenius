// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import utilities
const { setupLogger } = require('./src/utils/logger.util');
const { ensureDirectories } = require('./src/utils/cleanup.util');

// Import database and models
const { sequelize, testConnection } = require('./src/config/database');
const models = require('./src/models');

// Import routes
const documentRoutes = require('./src/routes/document.routes');
const authRoutes = require('./src/routes/auth.routes');
const documentsRoutes = require('./src/routes/documents.routes');
const comparisonRoutes = require('./src/routes/comparison.routes');
const extractionRoutes = require('./src/routes/extraction.routes');
const aiRoutes = require('./src/routes/ai.routes');
const searchRoutes = require('./src/routes/search.routes');

// Import queue service and job processor
const queueService = require('./src/services/queue.service');
const { initializeProcessors } = require('./src/jobs/document.processor');

// Setup logging
setupLogger();

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
      connectSrc: ["'self'", "https://openrouter.ai"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure required directories exist
ensureDirectories();

// Routes
app.use('/api', documentRoutes);            // Legacy document routes
app.use('/api/auth', authRoutes);           // Authentication
app.use('/api/documents', documentsRoutes); // Document CRUD
app.use('/api/compare', comparisonRoutes);  // Document comparison
app.use('/api/extract', extractionRoutes);  // Table/Form extraction
app.use('/api/ai', aiRoutes);               // AI analysis
app.use('/api/search', searchRoutes);        // Search endpoints

// Queue status endpoint
app.get('/api/queue/status', async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queue jobs endpoint
app.get('/api/queue/jobs', async (req, res) => {
  try {
    const jobs = await queueService.getRecentJobs(50);
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry job endpoint
app.post('/api/queue/jobs/:id/retry', async (req, res) => {
  try {
    const job = await queueService.retryJob(req.params.id);
    res.json({ success: true, job });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  const multer = require('multer');

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }

  if (error.code === 'UNSUPPORTED_FILE_TYPE') {
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

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (dbConnected) {
      // Sync database models
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');

      // Initialize job processors
      try {
        initializeProcessors();
        console.log('Job processors initialized');
      } catch (err) {
        console.log('Job processors not available (Redis may not be running):', err.message);
      }
    } else {
      console.log('Running without database connection');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`   PDFGenius Server Running on port ${PORT}`);
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
      console.log('  Processing:');
      console.log('    POST /api/process-document - Process with AI');
      console.log('    POST /api/convert-document - Convert to images');
      console.log('  Extraction:');
      console.log('    POST /api/extract/tables/:id - Extract tables');
      console.log('    POST /api/extract/forms/:id  - Extract forms');
      console.log('  Comparison:');
      console.log('    POST /api/compare        - Compare documents');
      console.log('  AI Analysis:');
      console.log('    POST /api/ai/summarize/:id - Summarize');
      console.log('    POST /api/ai/analyze/:id   - Analyze');
      console.log('  Health:');
      console.log('    GET  /api/health         - Health check');
      console.log('\n  Demo Login: demo@pdfgenius.com / demo123\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
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
