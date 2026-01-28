// routes/document.routes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload.middleware');
const DocumentService = require('../services/document.service');
const AIService = require('../services/ai.service');
const DocumentProcessor = require('../../document_processor');
const { cleanupFiles } = require('../utils/cleanup.util');
const { Document, DocumentPage } = require('../models');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
const documentService = new DocumentService();
const aiService = new AIService();
const processor = new DocumentProcessor();

function cleanupDocuments(jsonData) {
    try {
        const cleanedResults = processor.filterEmptyAndErrorDocs(jsonData);
        const allPages = new Set(jsonData.map(p => p.page));
        const cleanedPages = new Set(cleanedResults.map(p => p.page));
        const failedPages = [...allPages].filter(page => !cleanedPages.has(page));
        return [cleanedResults, failedPages];
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    }
}

// Convert document to images endpoint
router.post('/convert-document', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
    }

    let inputPath = req.file.path;
    const originalName = req.file.originalname;
    const extension = path.extname(originalName);
    
    const newPath = inputPath + extension;
    fs.renameSync(inputPath, newPath);
    inputPath = newPath;

    try {
        const images = await documentService.convertDocumentToBase64Images(inputPath, req.file.originalname);
        cleanupFiles([inputPath]);
        
        res.json({
            images,
            message: 'Document processed successfully'
        });
    } catch (error) {
        console.error('Error processing document:', error);
        cleanupFiles([inputPath]);
        res.status(500).json({ 
            error: 'Document processing failed', 
            details: error.message 
        });
    }
});

// Process document with AI endpoint - also saves to database
router.post('/process-document', authenticate, upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
    }

    let inputPath = req.file.path;
    const { customPrompt, model = 'openai/gpt-4o' } = req.body;
    const originalName = req.file.originalname;
    const extension = path.extname(originalName);

    const newPath = inputPath + extension;
    fs.renameSync(inputPath, newPath);
    inputPath = newPath;

    let document = null;

    try {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_KEY || req.headers['x-api-key'];
        if (!apiKey) {
            cleanupFiles([inputPath]);
            return res.status(400).json({ error: 'API key is required' });
        }

        // Create document record in database
        document = await Document.create({
            user_id: req.userId,
            original_name: originalName,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            status: 'processing',
            metadata: {
                uploadPath: inputPath,
                model: model,
                customPrompt: customPrompt
            }
        });

        console.log(`Document saved to database: ${document.id}`);
        console.log(`Converting document to images: ${originalName}`);
        const base64Images = await documentService.convertDocumentToBase64Images(inputPath, req.file.originalname);

        if (base64Images.length === 0) {
            await document.update({ status: 'failed', error_message: 'No pages could be extracted' });
            cleanupFiles([inputPath]);
            return res.status(400).json({ error: 'No pages could be extracted from the document' });
        }

        // Update total pages
        await document.update({ total_pages: base64Images.length });

        console.log(`Processing ${base64Images.length} pages with AI...`);

        // Use 1 image per request for accuracy, 5 concurrent requests to avoid rate limits
        const batchResults = await aiService.makeAIRequestBatchAsync(model, base64Images, apiKey, customPrompt, 1, 5, 3);
        console.log(`Completed AI processing`);

        const pageResults = [];
        aiService.flattenBatchResults(batchResults, pageResults);

        const [cleanedResults, failedPages] = cleanupDocuments(pageResults);
        console.log(`Clean pages: ${cleanedResults.length}, failed pages: ${failedPages.length}`);

        // Retry failed pages in parallel
        const retryResults = [];
        if (failedPages.length > 0) {
            console.log(`Retrying ${failedPages.length} failed pages...`);
            const failedImages = failedPages.map(pageNum => base64Images[pageNum - 1]);
            const retryBatchResults = await aiService.makeAIRequestBatchAsync(model, failedImages, apiKey, customPrompt, 1, 3, 2);

            // Map results back to original page numbers
            retryBatchResults.forEach((result, idx) => {
                if (result) {
                    result.startPage = failedPages[idx];
                    result.endPage = failedPages[idx];
                }
            });
            aiService.flattenBatchResults(retryBatchResults, retryResults);
        }

        const mergedResults = [...cleanedResults, ...retryResults];
        const finalResults = processor.filterEmptyAndErrorDocs(mergedResults);

        // Save pages to database
        for (const pageResult of finalResults) {
            await DocumentPage.create({
                document_id: document.id,
                page_number: pageResult.page,
                extracted_text: JSON.stringify(pageResult.data),
                has_tables: false,
                has_forms: false
            });
        }

        // Update document status to completed
        await document.update({
            status: 'completed',
            processing_method: 'semaphore_controlled_batch_analysis'
        });

        // DON'T delete the file - we need it for viewing later
        // cleanupFiles([inputPath]);

        console.log(`Successfully processed ${base64Images.length} pages`);

        res.json({
            success: true,
            documentId: document.id,
            totalPages: base64Images.length,
            totalBatches: batchResults.length,
            retriedPages: failedPages,
            results: finalResults,
            processingMethod: 'semaphore_controlled_batch_analysis'
        });

    } catch (error) {
        console.error('Document processing error:', error);
        if (document) {
            await document.update({ status: 'failed', error_message: error.message });
        }
        cleanupFiles([inputPath]);
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        libreoffice_queue: documentService.getLibreOfficeStatus()
    });
});

module.exports = router;

