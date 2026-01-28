const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProcessingJob = sequelize.define('ProcessingJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  document_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  job_type: {
    type: DataTypes.ENUM('convert', 'analyze', 'extract_tables', 'extract_forms', 'compare', 'summarize'),
    allowNull: false
  },
  bull_job_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'queued'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  result: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'processing_jobs',
  indexes: [
    { fields: ['document_id'] },
    { fields: ['status'] },
    { fields: ['job_type'] },
    { fields: ['bull_job_id'] }
  ]
});

module.exports = ProcessingJob;
