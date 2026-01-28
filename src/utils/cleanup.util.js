// utils/cleanup.util.js
const fs = require('fs');
const path = require('path');

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

            // Clean up files with same base name but different extensions
            try {
                const dir = path.dirname(filePath);
                const baseName = path.basename(filePath, path.extname(filePath));
                
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.forEach(file => {
                        const fullPath = path.join(dir, file);
                        const fileBaseName = path.basename(file, path.extname(file));
                        
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
        }
    });
};

const ensureDirectories = () => {
    const dirs = ['uploads', 'outputs', 'temp'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

module.exports = {
    cleanupFiles,
    ensureDirectories
};

