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
    throw new Error('STORAGE_ENABLED is true but the AWS SDK could not be loaded');
  }
}

class StorageService {
  constructor() {
    this.useCloud = useCloudStorage && S3Client;
    this.localStoragePath = path.join(__dirname, '../../uploads/storage');

    if (this.useCloud) {
      const required = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY', 'STORAGE_BUCKET'];
      const missing = required.filter((name) => !process.env[name]);
      if (missing.length > 0) {
        throw new Error(`Cloud storage configuration is incomplete: ${missing.join(', ')}`);
      }
      const endpoint = new URL(process.env.STORAGE_ENDPOINT);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) {
        throw new Error('Cloud storage endpoint must use a loopback host');
      }
      this.client = new S3Client({
        endpoint: endpoint.origin,
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.STORAGE_ACCESS_KEY,
          secretAccessKey: process.env.STORAGE_SECRET_KEY
        },
        forcePathStyle: true
      });
      this.bucket = process.env.STORAGE_BUCKET;
      console.log('Using cloud storage (MinIO/S3)');
    } else {
      // Ensure local storage directory exists
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
      console.log('Using isolated local file storage');
    }
  }

  generateStoragePath(originalName, prefix = 'documents') {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);
    return `${prefix}/${timestamp}_${uniqueId}${ext}`;
  }

  resolveLocalPath(storagePath) {
    if (typeof storagePath !== 'string' || storagePath.length === 0 || path.isAbsolute(storagePath)) {
      throw new Error('Invalid storage path');
    }
    const normalized = path.normalize(storagePath);
    if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      throw new Error('Storage path escapes the configured root');
    }
    return path.join(this.localStoragePath, normalized);
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
      const destPath = this.resolveLocalPath(storagePath);
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
      const destPath = this.resolveLocalPath(storagePath);
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
      const srcPath = this.resolveLocalPath(storagePath);
      fs.copyFileSync(srcPath, localPath);
      return localPath;
    }
  }

  async getFileBuffer(storagePath, maxBytes) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      throw new Error('A positive download size limit is required');
    }
    if (this.useCloud) {
      const head = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      }));
      if (!Number.isSafeInteger(head.ContentLength) || head.ContentLength > maxBytes) {
        throw new Error('Stored object exceeds the download size boundary');
      }
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      const response = await this.client.send(command);
      const chunks = [];
      let size = 0;
      for await (const chunk of response.Body) {
        size += chunk.length;
        if (size > maxBytes) throw new Error('Stored object exceeds the download size boundary');
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } else {
      const filePath = this.resolveLocalPath(storagePath);
      const stat = fs.lstatSync(filePath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
        throw new Error('Stored object is not a bounded regular file');
      }
      return fs.readFileSync(filePath);
    }
  }

  async deleteFile(storagePath) {
    if (this.useCloud) {
      // S3 DeleteObject is idempotent and can report success for a missing key.
      // Confirm the retained object exists so callers do not erase provenance
      // records for data that needs reconciliation.
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      }));
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath
      });
      await this.client.send(command);
    } else {
      const filePath = this.resolveLocalPath(storagePath);
      if (!fs.existsSync(filePath)) {
        throw new Error('Stored object is missing; deletion requires reconciliation');
      }
      fs.unlinkSync(filePath);
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
      const filePath = this.resolveLocalPath(storagePath);
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
      return this.resolveLocalPath(storagePath);
    }
  }

  getPublicUrl(storagePath) {
    if (this.useCloud) {
      return `${process.env.STORAGE_ENDPOINT.replace(/\/$/, '')}/${this.bucket}/${storagePath}`;
    } else {
      return this.resolveLocalPath(storagePath);
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
