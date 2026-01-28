const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExtractedTable = sequelize.define('ExtractedTable', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  document_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'documents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  page_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  table_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  headers: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  rows: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  raw_data: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  bounding_box: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  row_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  column_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'extracted_tables',
  updatedAt: false,
  indexes: [
    { fields: ['document_id'] },
    { fields: ['document_id', 'page_number'] }
  ]
});

module.exports = ExtractedTable;
