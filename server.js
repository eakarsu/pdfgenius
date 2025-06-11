// server.js
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const util = require('util');
const axios = require('axios');
const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();

const DocumentProcessor = require('./document_processor');
const processor = new DocumentProcessor();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}


function cleanupDocuments(jsonData) {
  try {
    // Clean using the class method

    // 3. Clean results and identify failed pages
    const cleanedResults = processor.filterEmptyAndErrorDocs(jsonData);
    const allPages = new Set(jsonData.map(p => p.page));
    const cleanedPages = new Set(cleanedResults.map(p => p.page));
    const failedPages = [...allPages].filter(page => !cleanedPages.has(page));

    return [cleanedResults,failedPages];

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

// Configure multer storage properly
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Create upload middleware with proper storage
const upload = multer({
  storage: storage,  // Make sure this is the diskStorage object
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream'
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
    const isExtensionValid = allowedExtensions.includes(fileExtension);

    if (isMimeTypeValid || isExtensionValid) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', {
        mimetype: file.mimetype,
        extension: fileExtension,
        filename: file.originalname
      });

      const error = new Error(`Unsupported file type: ${fileExtension || file.mimetype}`);
      error.code = 'UNSUPPORTED_FILE_TYPE';
      cb(error, false);
    }
  }
});

// Set up file upload with file type validation
const upload2 = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = ['uploads', 'outputs', 'temp'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// Helper function to clean up files
const cleanupFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Error cleaning up ${filePath}:`, error);
      }
    }

    // ✅ NEW: Clean up files with same base name but different extensions
    try {
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));

      // Read directory and find files with matching base name
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const fullPath = path.join(dir, file);
          const fileBaseName = path.basename(file, path.extname(file));

          // If base names match but it's not a directory
          if (fileBaseName === baseName && fs.statSync(fullPath).isFile()) {
            try {
              fs.unlinkSync(fullPath);
              console.log(`Cleaned up related file: ${fullPath}`);
            } catch (error) {
              console.error(`Error cleaning up related file ${fullPath}:`, error);
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error during extended cleanup for ${filePath}:`, error);
    }
  });
};


const makeAIRequestBatchAsync = async (model, base64Images, apiKey, customPrompt = null, maxImagesPerBatch = 3, maxConcurrentBatches = 2, maxRetries = 2) => {

  const defaultPrompt = "Extract all information from this document page as flat JSON structure. Include complete text transcription, measurements, specifications, numerical data, section titles, contract elements (CLINs, dates, amounts), and key details. Return data directly without nested 'data' objects. Use single page_number field matching actual page. CRITICAL: Only return results if page contains readable text - completely skip pages with empty content, blank arrays, or no extractable data. Return valid JSON only with no explanations.";

  // Create batches (assuming this logic exists before)
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

  console.log(`Processing ${base64Images.length} images in ${batches.length} batches with max ${maxConcurrentBatches} concurrent requests`);

  const allResults = [];

  // Enhanced batch processing function with retry logic
  const processBatchWithRetry = async (batchData, retryCount = 0) => {
    const { images, startPage, endPage, batchIndex } = batchData;

    try {
      console.log(`Starting batch ${batchIndex + 1}: pages ${startPage}-${endPage}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

      // Build content array with prompt and images
      const content = [
        {
          type: "text",
          text: `${customPrompt || defaultPrompt}
Process these ${images.length} pages of the government contract. Return an array with ${images.length} objects, one for each page.`
        }
      ];

      // Add all images in this batch
      images.forEach((base64Image, imageIndex) => {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        });
      });

      // Make API request
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 32000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 600000 // 10 minutes
      });

      console.log(`Completed batch ${batchIndex + 1}: pages ${startPage}-${endPage}${retryCount > 0 ? ` (retry ${retryCount} successful)` : ''}`);

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
      console.error(`Error processing batch ${batchIndex + 1} (pages ${startPage}-${endPage})${retryCount > 0 ? ` (retry ${retryCount})` : ''}:`, error.message);

      // Handle specific error types
      let errorType = 'unknown';
      let shouldRetry = false;

      if (error.response?.status === 402) {
        errorType = 'payment_required';
      } else if (error.response?.status === 429) {
        errorType = 'rate_limit';
        shouldRetry = true;
      } else if (error.code === 'ECONNABORTED') {
        errorType = 'timeout';
        shouldRetry = true;
      } else if (error.message.includes('aborted')) {
        errorType = 'aborted';
        shouldRetry = true;
      } else if (error.response?.status >= 500) {
        errorType = 'server_error';
        shouldRetry = true;
      }

      // Retry logic for specific error types
      if (shouldRetry && retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 3000; // Exponential backoff: 3s, 6s, 12s
        console.log(`Retrying batch ${batchIndex + 1} in ${delayMs / 1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return await processBatchWithRetry(batchData, retryCount + 1);
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
  };

  // Process batches in groups to limit concurrency
  for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
    const batchGroup = batches.slice(i, i + maxConcurrentBatches);
    console.log(`Processing batch group ${Math.floor(i / maxConcurrentBatches) + 1}/${Math.ceil(batches.length / maxConcurrentBatches)} with ${batchGroup.length} concurrent requests`);

    // Create promises for this group of batches with retry logic
    const promises = batchGroup.map(batchData => processBatchWithRetry(batchData));

    // Wait for all batches in this group to complete
    const batchGroupResults = await Promise.all(promises);
    allResults.push(...batchGroupResults);

    // Add delay between batch groups to avoid overwhelming the API
    if (i + maxConcurrentBatches < batches.length) {
      console.log(`Waiting 5 seconds before next batch group...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Sort results by batch number to maintain order
  allResults.sort((a, b) => a.batch - b.batch);

  // Enhanced logging with retry information
  const successfulBatches = allResults.filter(r => r.success).length;
  const failedBatches = allResults.filter(r => !r.success).length;
  const retriedBatches = allResults.filter(r => r.retryCount > 0).length;

  console.log(`Batch processing complete: ${successfulBatches} successful, ${failedBatches} failed, ${retriedBatches} required retries`);

  // Log failed batches for debugging
  const failed = allResults.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('Failed batches:', failed.map(f => `Batch ${f.batch} (${f.errorType}): ${f.error}`));
  }

  return allResults;
};


// Convert document to base64 images
const convertDocumentToBase64Images = async (filePath, originalName) => {
  const outputDir = path.join('outputs', Date.now().toString());

  try {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileExt = path.extname(originalName).toLowerCase();

    if (fileExt === '.pdf') {
      // Direct PDF processing using pdftoppm
      await execPromise(`pdftoppm -jpeg -r 300 "${filePath}" "${outputDir}/page"`);
    } else {
      // Convert other documents to PDF first using LibreOffice
      const platform = process.platform;
      let libreofficePath;

      if (platform === 'darwin') {
        libreofficePath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
      } else if (platform === 'linux') {
        libreofficePath = 'libreoffice';
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Convert to PDF
      await execPromise(`"${libreofficePath}" --convert-to pdf --outdir "${outputDir}" "${filePath}"`);

      // Find the generated PDF
      const files = fs.readdirSync(outputDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      if (pdfFiles.length === 0) {
        throw new Error('No PDF files found after conversion');
      }
      const pdfPath = path.join(outputDir, pdfFiles[0]);

      // Convert PDF to images
      await execPromise(`pdftoppm -jpeg -r 300 "${pdfPath}" "${outputDir}/page"`);
    }

    // Read generated images
    const files = fs.readdirSync(outputDir);
    const imageFiles = files.filter(file => file.match(/page-\d+\.jpg/) || file.match(/page\d+\.jpg/));

    // Sort by page number
    imageFiles.sort((a, b) => {
      const pageA = parseInt(a.match(/\d+/)[0]);
      const pageB = parseInt(b.match(/\d+/)[0]);
      return pageA - pageB;
    });

    // Convert to base64
    const images = [];
    for (const imageFile of imageFiles) {
      const imagePath = path.join(outputDir, imageFile);
      const imageData = fs.readFileSync(imagePath);
      images.push(Buffer.from(imageData).toString('base64'));
    }

    // Clean up output directory
    cleanupFiles([outputDir]);

    return images;
  } catch (error) {
    // Clean up on error
    cleanupFiles([outputDir]);
    throw error;
  }
};

// API endpoint to convert documents to images (existing)
app.post('/api/convert-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file provided' });
  }

  const inputPath = req.file.path;

  const originalName = req.file.originalname;
  const extension = path.extname(originalName);
  // Create new path with extension
  const newPath = inputPath + extension;
  // Rename file to include extension
  fs.renameSync(inputPath, newPath);
  inputPath = newPath

  try {
    const images = await convertDocumentToBase64Images(inputPath, req.file.originalname);

    // Clean up uploaded file
    cleanupFiles([inputPath]);

    res.json({
      images,
      message: 'Document processed successfully'
    });
  } catch (error) {
    console.error('Error processing document:', error);
    cleanupFiles([inputPath]);
    res.status(500).json({ error: 'Document processing failed', details: error.message });
  }
});

const flattenBatchResults = (batchResults, pageResults) => {
  // Process batch results into page format
  try {
    batchResults.forEach(batchResult => {
      if (batchResult.result && batchResult.result.choices && batchResult.result.choices[0]) {
        let content = batchResult.result.choices[0].message.content;

        if (typeof content === 'string') {
          content = content.replace(/^.*\s*```json\s*/, '')
            .replace(/```\s*[\s\S]*$/, '')
            .replace(/\\'/g, "'");
          try {
            content = JSON.parse(content);
          } catch (e) {
            console.error(`Failed to parse JSON for batch ${batchResult.batch}:`, e);
            content = [{ error: 'Invalid response format', rawResponse: content }];
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
          // Single object response
          for (let i = 0; i < batchResult.pages; i++) {
            pageResults.push({
              page: batchResult.startPage + i,
              data: content
            });
          }
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
    console.error('Document processing error:', error);
    cleanupFiles([inputPath]);
    res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });
    return pageResults
  }
}

app.post('/api/process-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file provided' });
  }

  let inputPath = req.file.path;
  const { customPrompt, model = 'openai/gpt-4.1' } = req.body;

  const originalName = req.file.originalname;
  const extension = path.extname(originalName);
  // Create new path with extension
  const newPath = inputPath + extension;
  // Rename file to include extension
  fs.renameSync(inputPath, newPath);
  inputPath = newPath;

  try {
    // Get API key from environment or request headers
    const apiKey = process.env.REACT_APP_OPENROUTER_KEY || req.headers['x-api-key'];

    if (!apiKey) {
      cleanupFiles([inputPath]);
      return res.status(400).json({ error: 'API key is required' });
    }

    console.log('Converting document to images...');
    const base64Images = await convertDocumentToBase64Images(inputPath, req.file.originalname);

    if (base64Images.length === 0) {
      cleanupFiles([inputPath]);
      return res.status(400).json({ error: 'No pages could be extracted from the document' });
    }

    console.log(`Processing ${base64Images.length} pages with AI in one request...`);


    // Use batch processing instead of single request
    const batchResults = await makeAIRequestBatchAsync(model, base64Images, apiKey, customPrompt, 5, 30);

    const pageResults = [];
    // Process batch results into page format
    flattenBatchResults(batchResults, pageResults)
    const [cleanedResults,failedPages] = cleanupDocuments(pageResults);
    // 4. Retry failed pages one by one
    const retryResults = [];
    for (const pageNum of failedPages) {
      const image = base64Images[pageNum - 1]; // adjust index if needed
      const retryBatchResults = await makeAIRequestBatchAsync(model, [image], apiKey, customPrompt, 1, 1);
      flattenBatchResults(retryBatchResults, retryResults)
    }
    // 5. Merge and clean again
    const mergedResults = [...cleanedResults, ...retryResults];
    const finalResults = processor.filterEmptyAndErrorDocs(mergedResults);
    cleanupFiles([inputPath]);

    res.json({
      success: true,
      totalPages: base64Images.length,
      totalBatches: batchResults.length,
      retriedPages: failedPages,
      results: finalResults,
      processingMethod: 'detailed_batch_analysis'
    });
  } catch (error) {
    console.error('Document processing error:', error);
    cleanupFiles([inputPath]);
    res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });
    return pageResults
  }

});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Use environment variable for port or default to 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

