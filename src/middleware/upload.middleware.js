// middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');

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

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
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

module.exports = upload;

