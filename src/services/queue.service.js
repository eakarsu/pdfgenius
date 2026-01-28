const { ProcessingJob } = require('../models');
require('dotenv').config();

let Queue;
let redisAvailable = false;
let documentQueue, analysisQueue, extractionQueue;

// Try to initialize Bull.js with Redis
try {
  Queue = require('bull');

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  };

  documentQueue = new Queue('document-processing', { redis: redisConfig });
  analysisQueue = new Queue('ai-analysis', { redis: redisConfig });
  extractionQueue = new Queue('data-extraction', { redis: redisConfig });

  // Test connection
  documentQueue.client.on('ready', () => {
    redisAvailable = true;
    console.log('Redis connected - Queue processing enabled');
  });

  documentQueue.client.on('error', (err) => {
    redisAvailable = false;
    console.log('Redis not available - Using synchronous processing');
  });
} catch (err) {
  console.log('Bull.js not available - Using synchronous processing');
}

class QueueService {
  constructor() {
    this.queues = redisAvailable ? {
      document: documentQueue,
      analysis: analysisQueue,
      extraction: extractionQueue
    } : {};

    if (redisAvailable) {
      this.setupEventHandlers();
    }
  }

  isAvailable() {
    return redisAvailable;
  }

  setupEventHandlers() {
    if (!redisAvailable) return;

    Object.entries(this.queues).forEach(([name, queue]) => {
      queue.on('completed', async (job, result) => {
        console.log(`[${name}] Job ${job.id} completed`);
        await this.updateJobStatus(job.data.jobId, 'completed', result);
      });

      queue.on('failed', async (job, err) => {
        console.error(`[${name}] Job ${job.id} failed:`, err.message);
        await this.updateJobStatus(job.data.jobId, 'failed', null, err.message);
      });

      queue.on('progress', async (job, progress) => {
        await this.updateJobProgress(job.data.jobId, progress);
      });
    });
  }

  async addDocumentJob(documentId, jobType, options = {}) {
    const job = await ProcessingJob.create({
      document_id: documentId,
      job_type: jobType,
      status: redisAvailable ? 'queued' : 'processing',
      metadata: options
    });

    if (redisAvailable && this.queues.document) {
      const bullJob = await this.queues.document.add(
        { jobId: job.id, documentId, jobType, ...options },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
      await job.update({ bull_job_id: bullJob.id.toString() });
    }

    return { jobId: job.id, bullJobId: null };
  }

  async addAnalysisJob(documentId, analysisType, options = {}) {
    const job = await ProcessingJob.create({
      document_id: documentId,
      job_type: analysisType,
      status: redisAvailable ? 'queued' : 'processing',
      metadata: options
    });

    if (redisAvailable && this.queues.analysis) {
      const bullJob = await this.queues.analysis.add(
        { jobId: job.id, documentId, analysisType, ...options },
        { attempts: 2, timeout: 300000 }
      );
      await job.update({ bull_job_id: bullJob.id.toString() });
    }

    return { jobId: job.id, bullJobId: null };
  }

  async addExtractionJob(documentId, extractionType, options = {}) {
    const job = await ProcessingJob.create({
      document_id: documentId,
      job_type: extractionType,
      status: redisAvailable ? 'queued' : 'processing',
      metadata: options
    });

    if (redisAvailable && this.queues.extraction) {
      const bullJob = await this.queues.extraction.add(
        { jobId: job.id, documentId, extractionType, ...options },
        { attempts: 2 }
      );
      await job.update({ bull_job_id: bullJob.id.toString() });
    }

    return { jobId: job.id, bullJobId: null };
  }

  async updateJobStatus(jobId, status, result = null, error = null) {
    try {
      const job = await ProcessingJob.findByPk(jobId);
      if (job) {
        const updates = { status };
        if (result) updates.result = result;
        if (error) updates.error = error;
        if (status === 'processing') updates.started_at = new Date();
        if (status === 'completed' || status === 'failed') {
          updates.completed_at = new Date();
          updates.progress = status === 'completed' ? 100 : job.progress;
        }
        await job.update(updates);
      }
    } catch (err) {
      console.error('Update job status error:', err.message);
    }
  }

  async updateJobProgress(jobId, progress) {
    try {
      const job = await ProcessingJob.findByPk(jobId);
      if (job) {
        await job.update({ progress, status: 'processing' });
      }
    } catch (err) {
      console.error('Update job progress error:', err.message);
    }
  }

  async getJobStatus(jobId) {
    const job = await ProcessingJob.findByPk(jobId);
    if (!job) throw new Error('Job not found');
    return job;
  }

  async getQueueStats() {
    if (!redisAvailable) {
      return { message: 'Queue not available - using synchronous processing' };
    }

    const stats = {};
    for (const [name, queue] of Object.entries(this.queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      stats[name] = { waiting, active, completed, failed, delayed };
    }
    return stats;
  }

  async getRecentJobs(limit = 20) {
    return ProcessingJob.findAll({
      order: [['created_at', 'DESC']],
      limit
    });
  }

  async retryJob(jobId) {
    const job = await ProcessingJob.findByPk(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== 'failed') throw new Error('Only failed jobs can be retried');

    await job.update({
      status: 'queued',
      progress: 0,
      error: null,
      started_at: null,
      completed_at: null
    });

    return job;
  }

  async cancelJob(jobId) {
    const job = await ProcessingJob.findByPk(jobId);
    if (!job) throw new Error('Job not found');
    await job.update({ status: 'cancelled' });
    return job;
  }

  getQueues() {
    return this.queues;
  }
}

module.exports = new QueueService();
