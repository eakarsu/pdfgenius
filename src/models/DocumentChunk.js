const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Chunked text + per-chunk summaries used for map-reduce summarization
 * and as the source for RAG retrieval.
 */
const DocumentChunk = sequelize.define(
  'DocumentChunk',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    document_id: { type: DataTypes.UUID, allowNull: false },
    chunk_index: { type: DataTypes.INTEGER, allowNull: false },
    page_start: { type: DataTypes.INTEGER, allowNull: true },
    page_end: { type: DataTypes.INTEGER, allowNull: true },
    text: { type: DataTypes.TEXT, allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: true },
    citations: { type: DataTypes.JSONB, defaultValue: [] }, // [{page, snippet}]
    embedding: { type: DataTypes.ARRAY(DataTypes.FLOAT), allowNull: true },
    tokens: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'document_chunks',
    indexes: [
      { fields: ['document_id'] },
      { fields: ['document_id', 'chunk_index'], unique: true },
    ],
  },
);

module.exports = DocumentChunk;
