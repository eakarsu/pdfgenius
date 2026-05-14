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

// 503 guard for routes that require LLM access
function requireAIKey(req, res, next) {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({
      error: 'AI service not configured',
      message: 'OPENROUTER_API_KEY environment variable is not set'
    });
  }
  next();
}

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
 * POST /api/ai/analyze/:documentId/stream
 * Streaming AI analysis via SSE (text/event-stream).
 *
 * Client usage:
 *   const es = new EventSource(url);  // or fetch with ReadableStream for POST
 *   es.addEventListener('token', e => process(e.data));
 *   es.addEventListener('result', e => { const r = JSON.parse(e.data); ... });
 *   es.addEventListener('error', e => { ... });
 *
 * Because EventSource only supports GET, callers should use fetch() with
 * { method: 'POST', body: JSON.stringify({model, prompt}), ... } and read
 * the response body as a stream.
 */
router.post('/analyze/:documentId/stream', authenticate, authorize('ai', 'create'), async (req, res) => {
  // --- SSE headers ---
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages']
    });

    if (!document) {
      sendEvent('error', { message: 'Document not found' });
      return res.end();
    }

    const { model = DEFAULT_MODEL, prompt } = req.body;

    if (!prompt) {
      sendEvent('error', { message: 'Prompt is required' });
      return res.end();
    }

    // Build full prompt from document text
    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || JSON.stringify(p.extracted_data || {}))
      .join('\n\n');

    const fullPrompt = `${prompt}\n\nDocument content:\n${fullText.substring(0, 40000)}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      sendEvent('error', { message: 'OpenRouter API key not configured' });
      return res.end();
    }

    // --- Call OpenRouter with stream: true ---
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pdfgenius.com',
        'X-Title': 'PDFGenius'
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 4000,
        stream: true
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      sendEvent('error', { message: `OpenRouter error: ${errText}` });
      return res.end();
    }

    // Stream SSE tokens back to client and accumulate full text
    let fullResult = '';
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    // Handle client disconnect
    req.on('close', () => reader.cancel());

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        const token = parsed?.choices?.[0]?.delta?.content;
        if (token) {
          fullResult += token;
          sendEvent('token', { token });
        }
      }
    }

    // Persist the completed result
    let job;
    try {
      job = await ProcessingJob.create({
        document_id: document.id,
        job_type: 'analyze',
        status: 'completed',
        progress: 100,
        result: { model, analysis: fullResult, prompt },
        completed_at: new Date()
      });
    } catch (dbErr) {
      console.error('Failed to persist streaming result:', dbErr.message);
    }

    // Send final structured JSON as the last event
    sendEvent('result', {
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      model,
      result: fullResult,
      jobId: job?.id || null
    });

    res.end();
  } catch (error) {
    console.error('Streaming analysis error:', error);
    sendEvent('error', { message: error.message });
    res.end();
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

/**
 * POST /api/ai/classify/:documentId
 * Classify document into a category and recommend routing.
 */
router.post('/classify/:documentId', authenticate, authorize('ai', 'create'), async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages']
    });
    if (!document) return res.status(404).json({ error: 'Not found', message: 'Document not found' });

    const { model = DEFAULT_MODEL, customCategories } = req.body;
    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || '')
      .join('\n\n')
      .substring(0, 30000);

    const categoriesNote = Array.isArray(customCategories) && customCategories.length
      ? `Use these candidate categories: ${customCategories.join(', ')}.`
      : 'Use sensible categories such as: Contract, Invoice, Receipt, Resume, Legal Filing, Medical Record, Tax Form, Policy, Report, Letter, Other.';

    const prompt = `You are a document classifier. ${categoriesNote}
Return STRICT JSON only with shape:
{ "category": "string", "subType": "string", "confidence": 0.0-1.0, "suggestedRouting": "department/queue", "reasoning": "1-2 sentences", "extractedKeyFields": { } }

Document text:
${fullText}`;

    const result = await callOpenRouterAPI(model, prompt);
    let parsed;
    try {
      const m = result.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { rawAnalysis: result };
    } catch (_) {
      parsed = { rawAnalysis: result };
    }

    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'classify',
      status: 'completed',
      progress: 100,
      result: { model, classification: parsed },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      classification: parsed,
      jobId: job.id
    });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: 'Classification failed', message: error.message });
  }
});

/**
 * POST /api/ai/compliance-check/:documentId
 * Run an informational compliance scan against a list of regulatory frameworks.
 */
router.post('/compliance-check/:documentId', authenticate, authorize('ai', 'create'), async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages']
    });
    if (!document) return res.status(404).json({ error: 'Not found', message: 'Document not found' });

    const { model = DEFAULT_MODEL, frameworks } = req.body;
    const fwks = Array.isArray(frameworks) && frameworks.length ? frameworks : ['GDPR', 'HIPAA', 'PCI-DSS'];

    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || '')
      .join('\n\n')
      .substring(0, 30000);

    const prompt = `You are a compliance reviewer. Scan the document text against the following frameworks: ${fwks.join(', ')}. Identify likely PII/PHI/PCI exposures and policy violations.
Return STRICT JSON only with shape:
{ "frameworks": ["..."], "findings": [{ "framework": "...", "severity": "low|medium|high|critical", "issue": "...", "evidenceSnippet": "...", "recommendation": "..." }], "overallRisk": "low|medium|high", "summary": "1-2 sentences" }

This is informational only and not legal advice.

Document text:
${fullText}`;

    const result = await callOpenRouterAPI(model, prompt);
    let parsed;
    try {
      const m = result.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { rawAnalysis: result };
    } catch (_) {
      parsed = { rawAnalysis: result };
    }

    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'compliance_check',
      status: 'completed',
      progress: 100,
      result: { model, compliance: parsed, frameworks: fwks },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      compliance: parsed,
      frameworks: fwks,
      jobId: job.id
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Compliance check failed', message: error.message });
  }
});

/**
 * POST /api/ai/translate/:documentId
 * Translate the document text into a target language.
 * Body: { targetLanguage: string, sourceLanguage?: string, model?: string, preserveStructure?: boolean }
 */
router.post('/translate/:documentId', authenticate, authorize('ai', 'create'), requireAIKey, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages']
    });
    if (!document) return res.status(404).json({ error: 'Not found', message: 'Document not found' });

    const { model = DEFAULT_MODEL, targetLanguage, sourceLanguage, preserveStructure } = req.body || {};
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({ error: 'Bad request', message: 'targetLanguage is required' });
    }

    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || '')
      .join('\n\n')
      .substring(0, 30000);

    const prompt = `You are a professional translator. Translate the following document${sourceLanguage ? ` from ${sourceLanguage}` : ''} into ${targetLanguage}.
${preserveStructure === false ? 'Produce idiomatic prose.' : 'Preserve original paragraphing, lists, and headings.'}
Return STRICT JSON only with shape:
{ "targetLanguage": "${targetLanguage}", "sourceLanguageDetected": "string", "translation": "full translated text", "notes": "1-2 sentences on tone/terminology choices", "confidence": 0.0-1.0 }

Document text:
${fullText}`;

    const result = await callOpenRouterAPI(model, prompt);
    let parsed;
    try {
      const m = result.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { translation: result };
    } catch (_) {
      parsed = { translation: result };
    }

    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'translate',
      status: 'completed',
      progress: 100,
      result: { model, translation: parsed, targetLanguage, sourceLanguage: sourceLanguage || null },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      translation: parsed,
      targetLanguage,
      jobId: job.id
    });
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: 'Translation failed', message: error.message });
  }
});

/**
 * POST /api/ai/redaction-suggestions/:documentId
 * Suggest sensitive spans to redact (PII/PHI/PCI/secrets) without modifying the document.
 * Body: { categories?: string[], model?: string }
 */
router.post('/redaction-suggestions/:documentId', authenticate, authorize('ai', 'create'), requireAIKey, async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId, user_id: req.userId },
      include: ['pages']
    });
    if (!document) return res.status(404).json({ error: 'Not found', message: 'Document not found' });

    const { model = DEFAULT_MODEL, categories } = req.body || {};
    const cats = Array.isArray(categories) && categories.length
      ? categories
      : ['PII', 'PHI', 'PCI', 'Credentials', 'TradeSecrets'];

    const pages = document.pages || [];
    const fullText = pages
      .sort((a, b) => a.page_number - b.page_number)
      .map(p => p.extracted_text || '')
      .join('\n\n')
      .substring(0, 30000);

    const prompt = `You are a redaction reviewer. Identify sensitive spans in the document that should be redacted across these categories: ${cats.join(', ')}.
Return STRICT JSON only with shape:
{ "categories": ["..."], "suggestions": [{ "category": "...", "snippet": "exact text to redact", "reason": "...", "severity": "low|medium|high|critical", "approxPage": <int|null>, "replacement": "[REDACTED:CATEGORY]" }], "overallSensitivity": "low|medium|high", "summary": "1-2 sentences" }
Do not modify the document; only suggest spans.

Document text:
${fullText}`;

    const result = await callOpenRouterAPI(model, prompt);
    let parsed;
    try {
      const m = result.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { rawAnalysis: result };
    } catch (_) {
      parsed = { rawAnalysis: result };
    }

    const job = await ProcessingJob.create({
      document_id: document.id,
      job_type: 'redaction_suggestions',
      status: 'completed',
      progress: 100,
      result: { model, redaction: parsed, categories: cats },
      completed_at: new Date()
    });

    res.json({
      success: true,
      documentId: document.id,
      documentName: document.original_name,
      redaction: parsed,
      categories: cats,
      jobId: job.id
    });
  } catch (error) {
    console.error('Redaction suggestions error:', error);
    res.status(500).json({ error: 'Redaction suggestion failed', message: error.message });
  }
});

module.exports = router;
