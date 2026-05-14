const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AIUsageLog = sequelize.define(
  'AIUsageLog',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    feature: { type: DataTypes.STRING(100), allowNull: false },
    model: { type: DataTypes.STRING(200), allowNull: true },
    input: { type: DataTypes.JSONB, allowNull: true },
    output: { type: DataTypes.JSONB, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    duration_ms: { type: DataTypes.INTEGER, allowNull: true },
    tokens_in: { type: DataTypes.INTEGER, allowNull: true },
    tokens_out: { type: DataTypes.INTEGER, allowNull: true },
    cost_usd: { type: DataTypes.DECIMAL(10, 6), allowNull: true },
  },
  {
    tableName: 'ai_usage_log',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['feature'] },
      { fields: ['created_at'] },
    ],
  },
);

module.exports = AIUsageLog;
