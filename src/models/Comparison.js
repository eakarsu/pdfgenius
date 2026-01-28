const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Comparison = sequelize.define('Comparison', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  document_a_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  document_b_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  comparison_type: {
    type: DataTypes.ENUM('text', 'structural', 'semantic', 'full'),
    defaultValue: 'text'
  },
  result: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  similarity_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  differences_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'comparisons',
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['document_a_id'] },
    { fields: ['document_b_id'] }
  ]
});

module.exports = Comparison;
