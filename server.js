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

const upload = multer({ 
  storage: 'uploads/',  // Use diskStorage instead of dest
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    // Define allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/octet-stream'  // Sometimes files come as this
    ];
    
    // Define allowed file extensions as backup
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check both MIME type and file extension
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
      
      const error = new Error(`Unsupported file type: ${fileExtension || file.mimetype}. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX`);
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


// AI processing function
const makeAIRequest = async (model, base64Image, apiKey, customPrompt = null) => {
  const defaultPrompt = "Extract all information from this document page and return as JSON data. Include any measurements, specifications, and details exactly as shown.";
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: customPrompt || defaultPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('AI Request Error:', error);
    throw error;
  }
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

// NEW API endpoint for complete PDF processing with AI
app.post('/api/process-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file provided' });
  }

  inputPath = req.file.path;
  const { customPrompt, model = 'openai/gpt-4.1' } = req.body;
  
  const originalName = req.file.originalname;
  const extension = path.extname(originalName);
   // Create new path with extension
  const newPath = inputPath + extension;
  // Rename file to include extension
  fs.renameSync(inputPath, newPath);
  inputPath = newPath

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

    console.log(`Processing ${base64Images.length} pages with AI...`);
    
    // Process all pages in parallel
    const requests = base64Images.map(async (base64Image, index) => {
      try {
        const aiResponse = await makeAIRequest(model, base64Image, apiKey, customPrompt);
        
        if (aiResponse?.choices?.[0]) {
          let pageData = aiResponse.choices[0].message.content;
          
          if (typeof pageData === 'string') {
            // Clean up the response
	    pageData = pageData.replace(/^```json\s*/, '')
                                 .replace(/```\s*$/, '')
                                 .replace(/\\'/g, "'");
            try {
              pageData = JSON.parse(pageData);
            } catch (e) {
              console.error(`Failed to parse JSON for page ${index + 1}:`, e);
              pageData = { error: 'Invalid response format', rawResponse: pageData };
            }
          }

          return {
            page: index + 1,
            data: pageData
          };
        }
        
        return {
          page: index + 1,
          data: { error: 'No valid response from AI' }
        };
      } catch (error) {
        console.error(`Error processing page ${index + 1}:`, error);
        return {
          page: index + 1,
          data: { error: 'Failed to process page', details: error.message }
        };
      }
    });

    const results = await Promise.all(requests);
    
    // Clean up uploaded file
    cleanupFiles([inputPath]);

    res.json({
      success: true,
      totalPages: results.length,
      results: results
    });

  } catch (error) {
    console.error('Document processing error:', error);
    cleanupFiles([inputPath]);
    res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });
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

