const queueService = require('../services/queue.service');
const tableService = require('../services/table.service');
const formService = require('../services/form.service');
const comparisonService = require('../services/comparison.service');
const { Document, DocumentPage, ProcessingJob } = require('../models');
const path = require('path');
const fs = require('fs');

// Import existing services
let documentService, aiService;
try {
  documentService = require('../services/document.service');
} catch (e) {
  console.log('Document service not found');
}
try {
  aiService = require('../services/ai.service');
} catch (e) {
  console.log('AI service not found');
}

/**
 * Initialize job processors
 */
function initializeProcessors() {
  const queues = queueService.getQueues();

  // Document processing queue
  queues.document.process(3, async (job) => {
    const { jobId, documentId, jobType } = job.data;
    console.log(`[Document Queue] Processing job ${jobId} - ${jobType}`);

    await queueService.updateJobStatus(jobId, 'processing');

    try {
      switch (jobType) {
        case 'convert':
          return await processConvert(job);
        case 'analyze':
          return await processAnalyze(job);
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      console.error(`[Document Queue] Job ${jobId} failed:`, error);
      throw error;
    }
  });

  // AI analysis queue
  queues.analysis.process(2, async (job) => {
    const { jobId, documentId, analysisType } = job.data;
    console.log(`[Analysis Queue] Processing job ${jobId} - ${analysisType}`);

    await queueService.updateJobStatus(jobId, 'processing');

    try {
      switch (analysisType) {
        case 'summarize':
          return await processSummarize(job);
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }
    } catch (error) {
      console.error(`[Analysis Queue] Job ${jobId} failed:`, error);
      throw error;
    }
  });

  // Extraction queue
  queues.extraction.process(3, async (job) => {
    const { jobId, documentId, extractionType } = job.data;
    console.log(`[Extraction Queue] Processing job ${jobId} - ${extractionType}`);

    await queueService.updateJobStatus(jobId, 'processing');

    try {
      switch (extractionType) {
        case 'extract_tables':
          return await processTableExtraction(job);
        case 'extract_forms':
          return await processFormExtraction(job);
        default:
          throw new Error(`Unknown extraction type: ${extractionType}`);
      }
    } catch (error) {
      console.error(`[Extraction Queue] Job ${jobId} failed:`, error);
      throw error;
    }
  });

  console.log('Job processors initialized');
}

/**
 * Process document conversion
 */
async function processConvert(job) {
  const { documentId, model, customPrompt } = job.data;

  const document = await Document.findByPk(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  job.progress(10);

  // Get the file path
  const filePath = document.metadata?.uploadPath;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Document file not found');
  }

  job.progress(20);

  // Convert document to images (if document service available)
  let images = [];
  if (documentService && documentService.convertDocumentToBase64Images) {
    images = await documentService.convertDocumentToBase64Images(filePath, document.original_name);
  }

  job.progress(50);

  // Store pages
  for (let i = 0; i < images.length; i++) {
    await DocumentPage.create({
      document_id: documentId,
      page_number: i + 1,
      extracted_data: {},
      extracted_text: ''
    });
    job.progress(50 + Math.floor((i / images.length) * 30));
  }

  await document.update({
    status: 'completed',
    total_pages: images.length
  });

  job.progress(100);

  return {
    success: true,
    pagesProcessed: images.length
  };
}

/**
 * Process document analysis with AI
 */
async function processAnalyze(job) {
  const { documentId, model = 'openai/gpt-4o', customPrompt } = job.data;

  const document = await Document.findByPk(documentId, {
    include: ['pages']
  });

  if (!document) {
    throw new Error('Document not found');
  }

  job.progress(10);

  // Get file path
  const filePath = document.metadata?.uploadPath;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Document file not found');
  }

  // Use AI service if available
  if (aiService && aiService.makeAIRequestBatchAsync) {
    // Convert to images first
    let images = [];
    if (documentService && documentService.convertDocumentToBase64Images) {
      images = await documentService.convertDocumentToBase64Images(filePath, document.original_name);
    }

    job.progress(30);

    // Process with AI
    const results = await aiService.makeAIRequestBatchAsync(images, model, customPrompt);

    job.progress(80);

    // Update pages with results
    for (let i = 0; i < results.length; i++) {
      const page = document.pages?.find(p => p.page_number === i + 1);
      if (page) {
        await page.update({
          extracted_data: results[i] || {},
          extracted_text: JSON.stringify(results[i] || {})
        });
      } else {
        await DocumentPage.create({
          document_id: documentId,
          page_number: i + 1,
          extracted_data: results[i] || {},
          extracted_text: JSON.stringify(results[i] || {})
        });
      }
    }

    await document.update({
      status: 'completed',
      total_pages: results.length,
      processing_method: model
    });

    job.progress(100);

    return {
      success: true,
      pagesProcessed: results.length,
      model
    };
  }

  // Fallback if no AI service
  await document.update({ status: 'completed' });
  job.progress(100);

  return {
    success: true,
    message: 'Processed without AI (service not available)'
  };
}

/**
 * Process AI summarization
 */
async function processSummarize(job) {
  const { documentId, model = 'openai/gpt-4o', customPrompt } = job.data;

  const document = await Document.findByPk(documentId, {
    include: ['pages']
  });

  if (!document) {
    throw new Error('Document not found');
  }

  job.progress(20);

  // Get text from pages
  const pages = document.pages || [];
  const fullText = pages
    .sort((a, b) => a.page_number - b.page_number)
    .map(p => p.extracted_text || JSON.stringify(p.extracted_data || {}))
    .join('\n\n');

  if (!fullText || fullText.length < 50) {
    throw new Error('Insufficient text content for summarization');
  }

  job.progress(40);

  // Call AI for summarization
  const prompt = customPrompt || `Please summarize this document:\n\n${fullText.substring(0, 50000)}`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    })
  });

  job.progress(80);

  if (!response.ok) {
    throw new Error(`AI API error: ${await response.text()}`);
  }

  const data = await response.json();
  const summary = data.choices[0]?.message?.content || '';

  job.progress(100);

  return {
    success: true,
    summary,
    model,
    textLength: fullText.length
  };
}

/**
 * Process table extraction
 */
async function processTableExtraction(job) {
  const { documentId } = job.data;

  job.progress(20);

  const tables = await tableService.extractTables(documentId);

  job.progress(100);

  return {
    success: true,
    tablesExtracted: tables.length
  };
}

/**
 * Process form field extraction
 */
async function processFormExtraction(job) {
  const { documentId } = job.data;

  job.progress(20);

  const fields = await formService.extractFormFields(documentId);

  job.progress(100);

  return {
    success: true,
    fieldsExtracted: fields.length
  };
}

module.exports = {
  initializeProcessors
};
