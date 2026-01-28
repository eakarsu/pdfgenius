const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FormField = sequelize.define('FormField', {
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
  field_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  field_type: {
    type: DataTypes.ENUM('text', 'checkbox', 'radio', 'signature', 'date', 'number', 'dropdown', 'unknown'),
    defaultValue: 'text'
  },
  field_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bounding_box: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  confidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  validation_rules: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'form_fields',
  updatedAt: false,
  indexes: [
    { fields: ['document_id'] },
    { fields: ['document_id', 'page_number'] },
    { fields: ['field_type'] }
  ]
});

module.exports = FormField;
