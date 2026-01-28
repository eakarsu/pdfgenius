// services/ai.service.js
const axios = require('axios');

class AIService {
    constructor() {
        this.defaultPrompt = `Extract content from this document as simple key-value pairs. Return flat JSON like:
{
  "page_number": 1,
  "document_title": "exact title",
  "section_1_title": "IDENTIFICATION OF THE AGENCY AND CONTRACTING ACTIVITY",
  "section_1_text": "exact verbatim text of section 1 as written",
  "section_2_title": "NATURE AND/OR DESCRIPTION OF THE ACTION",
  "section_2_text": "exact verbatim text of section 2 as written",
  "section_3_title": "next section title",
  "section_3_text": "exact text..."
}
IMPORTANT: Copy ALL text EXACTLY as it appears in the document - do not summarize or paraphrase. Use section_N_title and section_N_text for each numbered section. Return valid JSON only.`;

        // Adaptive rate limiting
        this.minDelayMs = 100;
        this.maxDelayMs = 5000;
        this.currentDelayMs = 200;
        this.consecutiveSuccesses = 0;
        this.consecutiveFailures = 0;
    }

    /**
     * Process images with adaptive concurrency and one-page-per-request for accuracy
     */
    async makeAIRequestBatchAsync(model, base64Images, apiKey, customPrompt = null, maxImagesPerBatch = 1, maxConcurrentRequests = 5, maxRetries = 3) {
        const totalPages = base64Images.length;
        console.log(`Processing ${totalPages} pages with max ${maxConcurrentRequests} concurrent requests`);

        // Process one page per request for accuracy (override batch size)
        const useOnePerRequest = maxImagesPerBatch === 1;

        if (useOnePerRequest) {
            return await this.processWithSemaphore(base64Images, model, apiKey, customPrompt, maxConcurrentRequests, maxRetries);
        } else {
            // Legacy batch mode for backwards compatibility
            return await this.processInBatches(base64Images, model, apiKey, customPrompt, maxImagesPerBatch, maxConcurrentRequests, maxRetries);
        }
    }

    /**
     * Semaphore-based parallel processing - one page per request
     * More accurate and handles rate limits better
     */
    async processWithSemaphore(base64Images, model, apiKey, customPrompt, maxConcurrent, maxRetries) {
        const results = new Array(base64Images.length);
        let activeRequests = 0;
        let completedCount = 0;
        let currentIndex = 0;

        const processNext = async () => {
            while (currentIndex < base64Images.length && activeRequests < maxConcurrent) {
                const pageIndex = currentIndex++;
                activeRequests++;

                // Don't await here - fire and continue
                this.processSinglePage(base64Images[pageIndex], pageIndex + 1, model, apiKey, customPrompt, maxRetries)
                    .then(result => {
                        results[pageIndex] = result;
                        completedCount++;
                        activeRequests--;

                        // Log progress
                        const progress = Math.round((completedCount / base64Images.length) * 100);
                        console.log(`Progress: ${completedCount}/${base64Images.length} (${progress}%) - Page ${pageIndex + 1} ${result.success ? 'completed' : 'failed'}`);

                        // Adaptive delay adjustment
                        if (result.success) {
                            this.onSuccess();
                        } else if (result.errorType === 'rate_limit') {
                            this.onRateLimit();
                        }
                    })
                    .catch(err => {
                        results[pageIndex] = {
                            batch: pageIndex + 1,
                            startPage: pageIndex + 1,
                            endPage: pageIndex + 1,
                            pages: 1,
                            error: err.message,
                            success: false
                        };
                        completedCount++;
                        activeRequests--;
                    });

                // Small stagger to prevent burst
                await this.delay(this.currentDelayMs);
            }
        };

        // Start initial batch of requests
        await processNext();

        // Wait for all to complete
        while (completedCount < base64Images.length) {
            await this.delay(100);
            await processNext();
        }

        const successCount = results.filter(r => r?.success).length;
        const failCount = results.filter(r => r && !r.success).length;
        console.log(`Batch processing complete: ${successCount} successful, ${failCount} failed`);

        return results;
    }

    /**
     * Process a single page with retries
     */
    async processSinglePage(base64Image, pageNumber, model, apiKey, customPrompt, maxRetries, retryCount = 0) {
        try {
            const content = [
                {
                    type: "text",
                    text: `${customPrompt || this.defaultPrompt}\nThis is page ${pageNumber}. Extract all content exactly as shown.`
                },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                    }
                }
            ];

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: [{
                    role: "user",
                    content: content
                }],
                max_tokens: 16000,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            return {
                batch: pageNumber,
                startPage: pageNumber,
                endPage: pageNumber,
                pages: 1,
                result: response.data,
                success: true,
                retryCount: retryCount,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const errorType = this.getErrorType(error);
            const shouldRetry = this.shouldRetryError(errorType);

            if (shouldRetry && retryCount < maxRetries) {
                const delayMs = Math.min(Math.pow(2, retryCount) * 1000, 30000);
                console.log(`Retrying page ${pageNumber} in ${delayMs / 1000}s (attempt ${retryCount + 1}/${maxRetries})`);
                await this.delay(delayMs);
                return await this.processSinglePage(base64Image, pageNumber, model, apiKey, customPrompt, maxRetries, retryCount + 1);
            }

            return {
                batch: pageNumber,
                startPage: pageNumber,
                endPage: pageNumber,
                pages: 1,
                error: error.message,
                errorType: errorType,
                success: false,
                retryCount: retryCount,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Legacy batch processing (multiple images per request)
     */
    async processInBatches(base64Images, model, apiKey, customPrompt, maxImagesPerBatch, maxConcurrentBatches, maxRetries) {
        const batches = this.createBatches(base64Images, maxImagesPerBatch);

        console.log(`Processing ${base64Images.length} images in ${batches.length} batches`);

        const allResults = [];

        for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
            const batchGroup = batches.slice(i, i + maxConcurrentBatches);
            console.log(`Processing batch group ${Math.floor(i / maxConcurrentBatches) + 1}/${Math.ceil(batches.length / maxConcurrentBatches)}`);

            const promises = batchGroup.map(batchData =>
                this.processBatchWithRetry(batchData, model, apiKey, customPrompt, maxRetries)
            );

            const batchGroupResults = await Promise.allSettled(promises);

            batchGroupResults.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    allResults.push(result.value);
                } else {
                    allResults.push({
                        batch: batchGroup[idx].batchIndex + 1,
                        startPage: batchGroup[idx].startPage,
                        endPage: batchGroup[idx].endPage,
                        pages: batchGroup[idx].images.length,
                        error: result.reason?.message || 'Unknown error',
                        success: false
                    });
                }
            });

            // Adaptive delay between batch groups
            if (i + maxConcurrentBatches < batches.length) {
                await this.delay(this.currentDelayMs * 2);
            }
        }

        allResults.sort((a, b) => a.batch - b.batch);
        return allResults;
    }

    createBatches(base64Images, maxImagesPerBatch) {
        const batches = [];
        for (let i = 0; i < base64Images.length; i += maxImagesPerBatch) {
            const images = base64Images.slice(i, i + maxImagesPerBatch);
            batches.push({
                images: images,
                startPage: i + 1,
                endPage: i + images.length,
                batchIndex: Math.floor(i / maxImagesPerBatch)
            });
        }
        return batches;
    }

    async processBatchWithRetry(batchData, model, apiKey, customPrompt, maxRetries, retryCount = 0) {
        const { images, startPage, endPage, batchIndex } = batchData;

        try {
            const content = [
                {
                    type: "text",
                    text: `${customPrompt || this.defaultPrompt}\nProcess these ${images.length} pages. Return an array with ${images.length} objects, one for each page.`
                }
            ];

            images.forEach((base64Image) => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                    }
                });
            });

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: [{
                    role: "user",
                    content: content
                }],
                max_tokens: 32000,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 300000
            });

            return {
                batch: batchIndex + 1,
                startPage: startPage,
                endPage: endPage,
                pages: images.length,
                result: response.data,
                success: true,
                retryCount: retryCount,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const errorType = this.getErrorType(error);
            const shouldRetry = this.shouldRetryError(errorType);

            if (shouldRetry && retryCount < maxRetries) {
                const delayMs = Math.pow(2, retryCount) * 2000;
                await this.delay(delayMs);
                return await this.processBatchWithRetry(batchData, model, apiKey, customPrompt, maxRetries, retryCount + 1);
            }

            return {
                batch: batchIndex + 1,
                startPage: startPage,
                endPage: endPage,
                pages: images.length,
                error: error.message,
                errorType: errorType,
                success: false,
                retryCount: retryCount,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Adaptive rate limiting methods
    onSuccess() {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;

        // Speed up if consistently successful
        if (this.consecutiveSuccesses > 5) {
            this.currentDelayMs = Math.max(this.minDelayMs, this.currentDelayMs * 0.8);
        }
    }

    onRateLimit() {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;

        // Slow down on rate limits
        this.currentDelayMs = Math.min(this.maxDelayMs, this.currentDelayMs * 2);
        console.log(`Rate limit hit, increasing delay to ${this.currentDelayMs}ms`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getErrorType(error) {
        if (error.response?.status === 401) return 'auth_error';
        if (error.response?.status === 402) return 'payment_required';
        if (error.response?.status === 429) return 'rate_limit';
        if (error.code === 'ECONNABORTED') return 'timeout';
        if (error.message?.includes('aborted')) return 'aborted';
        if (error.response?.status >= 500) return 'server_error';
        return 'unknown';
    }

    shouldRetryError(errorType) {
        return ['rate_limit', 'timeout', 'aborted', 'server_error'].includes(errorType);
    }

    flattenBatchResults(batchResults, pageResults) {
        try {
            batchResults.forEach(batchResult => {
                if (!batchResult) return;

                if (batchResult.result && batchResult.result.choices && batchResult.result.choices[0]) {
                    let content = batchResult.result.choices[0].message.content;

                    if (typeof content === 'string') {
                        // Clean markdown code blocks
                        content = content
                            .replace(/^[\s\S]*?```json\s*/i, '')
                            .replace(/```[\s\S]*$/i, '')
                            .replace(/\\'/g, "'")
                            .trim();

                        try {
                            content = JSON.parse(content);
                        } catch (e) {
                            // Try to extract JSON from response
                            const jsonMatch = content.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                try {
                                    content = JSON.parse(jsonMatch[0]);
                                } catch (e2) {
                                    console.error(`Failed to parse JSON for page ${batchResult.startPage}`);
                                    content = { error: 'Invalid JSON', rawResponse: content.substring(0, 500) };
                                }
                            } else {
                                content = { error: 'No JSON found', rawResponse: content.substring(0, 500) };
                            }
                        }
                    }

                    if (Array.isArray(content)) {
                        content.forEach((pageData, index) => {
                            pageResults.push({
                                page: batchResult.startPage + index,
                                data: pageData
                            });
                        });
                    } else {
                        // Single page result
                        pageResults.push({
                            page: batchResult.startPage,
                            data: content
                        });
                    }
                } else if (batchResult.error) {
                    for (let i = 0; i < batchResult.pages; i++) {
                        pageResults.push({
                            page: batchResult.startPage + i,
                            data: { error: batchResult.error }
                        });
                    }
                }
            });
        } catch (error) {
            console.error('Error flattening batch results:', error);
        }

        return pageResults;
    }
}

module.exports = AIService;
