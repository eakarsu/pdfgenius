// services/document.service.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const LibreOfficeService = require('./libreoffice.service');
const { cleanupFiles } = require('../utils/cleanup.util');

class DocumentService {
    constructor() {
        this.libreOfficeService = new LibreOfficeService();
    }

    async convertDocumentToBase64Images(filePath, originalName) {
        const outputDir = path.join('outputs', Date.now().toString());
        
        await this.libreOfficeService.acquireSemaphore();
        
        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const fileExt = path.extname(originalName).toLowerCase();
            
            if (fileExt === '.pdf') {
                await execPromise(`pdftoppm -jpeg -r 300 "${filePath}" "${outputDir}/page"`);
            } else {
                console.log(`Starting LibreOffice conversion for: ${originalName}`);
                await this.libreOfficeService.convertToPdfWithRetry(filePath, outputDir);
                
                const files = fs.readdirSync(outputDir);
                const pdfFiles = files.filter(file => file.endsWith('.pdf'));
                
                if (pdfFiles.length === 0) {
                    throw new Error('No PDF files found after LibreOffice conversion');
                }

                const pdfPath = path.join(outputDir, pdfFiles[0]);
                console.log(`Converting PDF to images: ${pdfPath}`);
                
                await execPromise(`pdftoppm -jpeg -r 300 "${pdfPath}" "${outputDir}/page"`);
            }

            const files = fs.readdirSync(outputDir);
            const imageFiles = files.filter(file => file.match(/page-\d+\.jpg/) || file.match(/page\d+\.jpg/));
            
            imageFiles.sort((a, b) => {
                const pageA = parseInt(a.match(/\d+/)[0]);
                const pageB = parseInt(b.match(/\d+/)[0]);
                return pageA - pageB;
            });

            const images = [];
            for (const imageFile of imageFiles) {
                const imagePath = path.join(outputDir, imageFile);
                const imageData = fs.readFileSync(imagePath);
                images.push(Buffer.from(imageData).toString('base64'));
            }

            cleanupFiles([outputDir]);
            
            console.log(`Successfully converted ${originalName} to ${images.length} images`);
            return images;
            
        } catch (error) {
            cleanupFiles([outputDir]);
            throw error;
        } finally {
            this.libreOfficeService.releaseSemaphore();
        }
    }

    getLibreOfficeStatus() {
        return this.libreOfficeService.getStatus();
    }
}

module.exports = DocumentService;

