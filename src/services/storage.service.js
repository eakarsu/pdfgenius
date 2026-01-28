const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Check if cloud storage is enabled
const useCloudStorage = process.env.STORAGE_ENABLED === 'true';

let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, getSignedUrl;

if (useCloudStorage) {
  try {
    const s3 = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    S3Client = s3.S3Client;
    PutObjectCommand = s3.PutObjectCommand;
    GetObjectCommand = s3.GetObjectCommand;
    DeleteObjectCommand = s3.DeleteObjectCommand;
    HeadObjectCommand = s3.HeadObjectCommand;
    getSignedUrl = presigner.getSignedUrl;
  } catch (err) {
    console.log('AWS SDK not available, using local storage');
  }
}

class StorageService {
  constructor() {
    this.useCloud = useCloudStorage && S3Client;
    this.localStoragePath = path.join(__dirname, '../../uploads/storage');

    if (this.useCloud) {
      this.client = new S3Client({
        endpoint: `http://${process.env.STORAGE_ENDPOINT || 'localhost'}:${process.env.STORAGE_PORT || 9000}`,
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
          secretAccessKey: process.env.STORAGE_SECRET_KEY || 'minioadmin'
        },
        forcePathStyle: true
      });
      this.bucket = process.env.STORAGE_BUCKET || 'pdfgenius';
      console.log('Using cloud storage (MinIO/S3)');
    } else {
      // Ensure local storage directory exists
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
      console.log('Using local file storage at:', this.localStoragePath);
    }
  }

  generateStoragePath(originalName, prefix = 'documents') {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);
    return `${prefix}/${timestamp}_${uniqueId}${ext}`;
  }

  async uploadFile(localPath, storagePath, contentType = 'application/octet-stream') {
    if (this.useCloud) {
      const fileContent = fs.readFileSync(localPath);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: fileContent,
        ContentType: contentType
      });
      await this.client.send(command);
      return {
        bucket: this.bucket,
        key: storagePath,
        url: this.getPublicUrl(storagePath)
      };
    } else {
      // Local storage
      const destPath = path.join(this.localStoragePath, storagePath);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(localPath, destPath);

      return {
        bucket: 'local',
        key: storagePath,
        url: destPath
      };
    }
  }

  async uploadBuffer(buffer, storagePath, contentType = 'application/octet-stream') {
    if (this.useCloud) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType
      });
      await this.client.send(command);
      return {
        bucket: this.bucket,
        key: storagePath,
        url: this.getPublicUrl(storagePath)
      };
    } else {
      const destPath = path.join(this.localStoragePath, storagePath);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, buffer);

      return {
        bucket: 'local',
        key: storagePath,
        url: destPath
      };
    }
  }

  async uploadBase64(base64Data, storagePath, contentType = 'image/jpeg') {
    const buffer = Buffer.from(base64Data, 'base64');
    return this.uploadBuffer(buffer, storagePath, contentType);
  }

  async downloadFile(storagePath, localPath) {
    if (this.useCloud) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      const response = await this.client.send(command);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(localPath, buffer);
      return localPath;
    } else {
      const srcPath = path.join(this.localStoragePath, storagePath);
      fs.copyFileSync(srcPath, localPath);
      return localPath;
    }
  }

  async getFileBuffer(storagePath) {
    if (this.useCloud) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      const response = await this.client.send(command);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } else {
      const filePath = path.join(this.localStoragePath, storagePath);
      return fs.readFileSync(filePath);
    }
  }

  async deleteFile(storagePath) {
    if (this.useCloud) {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      await this.client.send(command);
    } else {
      const filePath = path.join(this.localStoragePath, storagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return { deleted: true, key: storagePath };
  }

  async fileExists(storagePath) {
    if (this.useCloud) {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: storagePath
        });
        await this.client.send(command);
        return true;
      } catch (error) {
        return false;
      }
    } else {
      const filePath = path.join(this.localStoragePath, storagePath);
      return fs.existsSync(filePath);
    }
  }

  async getPresignedUrl(storagePath, expiresIn = 3600) {
    if (this.useCloud && getSignedUrl) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      return getSignedUrl(this.client, command, { expiresIn });
    } else {
      // Return local file path
      return path.join(this.localStoragePath, storagePath);
    }
  }

  getPublicUrl(storagePath) {
    if (this.useCloud) {
      const endpoint = process.env.STORAGE_ENDPOINT || 'localhost';
      const port = process.env.STORAGE_PORT || 9000;
      return `http://${endpoint}:${port}/${this.bucket}/${storagePath}`;
    } else {
      return path.join(this.localStoragePath, storagePath);
    }
  }

  async deleteFiles(storagePaths) {
    const results = await Promise.all(
      storagePaths.map(p => this.deleteFile(p).catch(err => ({ error: err.message, key: p })))
    );
    return results;
  }
}

module.exports = new StorageService();
