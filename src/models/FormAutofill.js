const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Cache of suggested values for fillable PDF form fields.
 * Sourced by matching the target form field name's embedding to the
 * embeddings of previously-extracted KV pairs from other documents.
 */
const FormAutofill = sequelize.define(
  'FormAutofill',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    document_id: { type: DataTypes.UUID, allowNull: false },
    field_name: { type: DataTypes.STRING(255), allowNull: false },
    suggested_value: { type: DataTypes.TEXT, allowNull: true },
    source_document_id: { type: DataTypes.UUID, allowNull: true },
    source_field_name: { type: DataTypes.STRING(255), allowNull: true },
    similarity_score: { type: DataTypes.FLOAT, allowNull: true },
    accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'form_autofills',
    indexes: [{ fields: ['user_id'] }, { fields: ['document_id'] }],
  },
);

module.exports = FormAutofill;
