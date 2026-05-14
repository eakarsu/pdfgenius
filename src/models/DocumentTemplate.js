const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Pre-tuned extraction templates for invoice/contract/lease.
 * `schema` is the target JSON shape; `prompt_overrides` allows overriding
 * the default extraction prompt; `post_processing` is an array of rules
 * (e.g. {type: "currency", field: "total"}).
 */
const DocumentTemplate = sequelize.define(
  'DocumentTemplate',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    document_class: {
      type: DataTypes.ENUM('invoice', 'contract', 'lease', 'receipt', 'custom'),
      defaultValue: 'custom',
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    schema: { type: DataTypes.JSONB, allowNull: false },
    prompt_overrides: { type: DataTypes.TEXT, allowNull: true },
    post_processing: { type: DataTypes.JSONB, defaultValue: [] },
    export_format: {
      type: DataTypes.ENUM('json', 'csv', 'quickbooks', 'xlsx'),
      defaultValue: 'json',
    },
    is_built_in: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'document_templates',
    indexes: [{ fields: ['user_id'] }, { fields: ['document_class'] }],
  },
);

module.exports = DocumentTemplate;
