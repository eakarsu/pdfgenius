const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentPage = sequelize.define('DocumentPage', {
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
  image_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  extracted_data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  extracted_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  has_tables: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  has_forms: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  confidence_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  }
}, {
  tableName: 'document_pages',
  updatedAt: false,
  indexes: [
    { fields: ['document_id'] },
    { fields: ['document_id', 'page_number'], unique: true }
  ]
});

module.exports = DocumentPage;
