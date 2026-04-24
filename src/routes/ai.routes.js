const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { Document, DocumentPage, ProcessingJob } = require('../models');
const queueService = require('../services/queue.service');

// Import existing AI service if available
let aiService;
try {
  aiService = require('../services/ai.service');
} catch (e) {
  console.log('AI service not found, using fallback');
}

// Default model from environment
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

/**
 * POST /api/ai/summarize/:documentId
 * Summarize document using AI
 */
router.post('/summarize/:documentId', authenticate, authorize('ai', 'create'), async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      },
      include: ['pages']
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const { model = DEFAULT_MODEL, customPrompt, async: asyncMode = false } = req.body;

    // Queue the summarization job
    if (asyncMode) {
      const job = await queueService.addAnalysisJob(document.id, 'summarize', {
        model,
        customPrompt
      });
      return res.json({
        success: true,
        message: 'Summarization queued',
        jobId: job.jobId
      });
    }

    // Get extracted text from pages
    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || JSON.stringify(p.extracted_data || {}))
      .join('\n\n---\n\n');

    if (!fullText || fullText.length < 50) {
      return res.status(400).json({
        error: 'Insufficient content',
        message: 'Document does not have enough extracted text for summarization'
      });
    }

    // Default summarization prompt
    const summaryPrompt = customPrompt || `Please provide a comprehensive summary of this document. Include:
1. Main topic and purpose
2. Key points and findings
3. Important data or statistics mentioned
4. Conclusions or recommendations

Document content:
${fullText.substring(0, 50000)}`; // Limit to ~50k chars

    // Call OpenRouter API
    const summary = await callOpenRouterAPI(model, summaryPrompt);

    // Store result in processing job
    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'summarize',
      status: 'completed',
      progress: 100,
      result: {
        model,
        summary,
        prompt: customPrompt || 'default summary prompt',
        textLength: fullText.length
      },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      model,
      summary,
      jobId: job.id
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({
      error: 'Summarization failed',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/extract/:documentId
 * Extract structured data from document using AI
 */
router.post('/extract/:documentId', authenticate, authorize('ai', 'create'), async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      },
      include: ['pages']
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const { model = DEFAULT_MODEL, schema, customPrompt } = req.body;

    // Get extracted text from pages
    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || JSON.stringify(p.extracted_data || {}))
      .join('\n\n');

    if (!fullText || fullText.length < 20) {
      return res.status(400).json({
        error: 'Insufficient content',
        message: 'Document does not have enough extracted text'
      });
    }

    // Build extraction prompt
    let extractionPrompt = customPrompt || 'Extract structured data from this document.';

    if (schema) {
      extractionPrompt += `\n\nPlease extract data matching this schema:\n${JSON.stringify(schema, null, 2)}`;
    }

    extractionPrompt += `\n\nReturn the result as valid JSON.\n\nDocument content:\n${fullText.substring(0, 30000)}`;

    // Call OpenRouter API
    const result = await callOpenRouterAPI(model, extractionPrompt);

    // Try to parse as JSON
    let extractedData;
    try {
      // Find JSON in response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result };
    } catch (e) {
      extractedData = { raw: result };
    }

    // Store result
    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'analyze',
      status: 'completed',
      progress: 100,
      result: {
        model,
        extractedData,
        schema,
        prompt: customPrompt
      },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      model,
      extractedData,
      jobId: job.id
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
});

/**
 * POST /api/ai/analyze/:documentId
 * Custom AI analysis with prompt
 */
router.post('/analyze/:documentId', authenticate, authorize('ai', 'create'), async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.documentId,
        user_id: req.userId
      },
      include: ['pages']
    });

    if (!document) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const { model = DEFAULT_MODEL, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Prompt is required'
      });
    }

    // Get extracted text from pages
    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || JSON.stringify(p.extracted_data || {}))
      .join('\n\n');

    const fullPrompt = `${prompt}\n\nDocument content:\n${fullText.substring(0, 40000)}`;

    // Call OpenRouter API
    const result = await callOpenRouterAPI(model, fullPrompt);

    // Store result
    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'analyze',
      status: 'completed',
      progress: 100,
      result: {
        model,
        analysis: result,
        prompt
      },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      model,
      result,
      jobId: job.id
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/history
 * Get AI analysis history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) {
      where.job_type = type;
    } else {
      where.job_type = ['summarize', 'analyze'];
    }

    // Get documents for user first
    const userDocs = await Document.findAll({
      where: { user_id: req.userId },
      attributes: ['id']
    });
    const docIds = userDocs.map(d => d.id);

    const { count, rows } = await ProcessingJob.findAndCountAll({
      where: {
        document_id: docIds,
        ...where
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [{
        association: 'document',
        attributes: ['id', 'original_name']
      }]
    });

    res.json({
      success: true,
      history: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('AI history error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/models
 * Get available AI models
 */
router.get('/models', authenticate, (req, res) => {
  res.json({
    success: true,
    defaultModel: DEFAULT_MODEL,
    models: [
      {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        provider: 'Anthropic',
        description: 'Fast and affordable for quick tasks'
      },
      {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        provider: 'Anthropic',
        description: 'Best balance of speed and intelligence'
      },
      {
        id: 'anthropic/claude-opus-4',
        name: 'Claude Opus 4',
        provider: 'Anthropic',
        description: 'Most capable for complex analysis'
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        description: 'Multimodal model with vision'
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        description: 'Fast and cost-effective'
      },
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
        description: 'Fast multimodal model'
      },
      {
        id: 'google/gemini-2.5-pro-preview',
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        description: 'Advanced reasoning capabilities'
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B',
        provider: 'Meta',
        description: 'Open source powerful model'
      }
    ]
  });
});

/**
 * Helper function to call OpenRouter API
 */
async function callOpenRouterAPI(model, prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const useModel = model || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://pdfgenius.com',
      'X-Title': 'PDFGenius'
    },
    body: JSON.stringify({
      model: useModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

module.exports = router;
