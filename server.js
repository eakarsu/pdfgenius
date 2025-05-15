// server.js
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(cors());

// Set up file upload
const upload = multer({ dest: 'uploads/' });

// Ensure directories exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('outputs')) {
  fs.mkdirSync('outputs');
}

app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));

// API endpoint to convert documents to images
app.post('/api/convert-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file provided' });
  }

  const inputPath = req.file.path;
  const outputDir = path.join('outputs', Date.now().toString());
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  try {
    // Get the file extension
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Step 1: Convert Word document to PDF using LibreOffice
    // Determine the LibreOffice executable path based on platform
    const platform = process.platform;
    let libreofficePath;
    
    if (platform === 'darwin') {
      // macOS path
      libreofficePath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    } else if (platform === 'linux') {
      // Linux path
      libreofficePath = 'libreoffice';
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    await execPromise(`"${libreofficePath}" --convert-to pdf --outdir "${outputDir}" "${inputPath}"`);
    
    // Step 2: Convert PDF to images using pdftoppm instead of ImageMagick
    // After LibreOffice conversion
    const files2 = fs.readdirSync(outputDir);
    const pdfFiles = files2.filter(file => file.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      throw new Error('No PDF files found after conversion');
    }
    const pdfPath = path.join(outputDir, pdfFiles[0]);

    // Using pdftoppm with 300 DPI for high quality
    await execPromise(`pdftoppm -jpeg -r 300 "${pdfPath}" "${outputDir}/page"`);
    
    // Read all generated images
    const files = fs.readdirSync(outputDir);
    // pdftoppm creates files with format page-01.jpg, page-02.jpg, etc.
    const imageFiles = files.filter(file => file.match(/page-\d+\.jpg/) || file.match(/page\d+\.jpg/));
    
    // Sort the image files by page number
    imageFiles.sort((a, b) => {
      const pageA = parseInt(a.match(/\d+/)[0]);
      const pageB = parseInt(b.match(/\d+/)[0]);
      return pageA - pageB;
    });
    
    // Convert images to base64
    const images = [];
    for (const imageFile of imageFiles) {
      const imagePath = path.join(outputDir, imageFile);
      const imageData = fs.readFileSync(imagePath);
      images.push(Buffer.from(imageData).toString('base64'));
    }
    
    // Clean up
    fs.unlinkSync(inputPath);
    
    res.json({ 
      images,
      message: 'Document processed successfully'
    });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: 'Document processing failed', details: error.message });
  }
});

// Use environment variable for port or default to 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
