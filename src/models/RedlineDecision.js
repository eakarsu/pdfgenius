const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Per-clause Accept/Reject decisions for the change-acceptance UI.
 * Each row stores the clause id from the comparison output and the user's
 * choice (or "PENDING") so a clean revised PDF can be emitted.
 */
const RedlineDecision = sequelize.define(
  'RedlineDecision',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    comparison_id: { type: DataTypes.UUID, allowNull: false },
    clause_key: { type: DataTypes.STRING(255), allowNull: false }, // e.g. "modifiedContent[2]"
    decision: { type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED'), defaultValue: 'PENDING' },
    decided_by: { type: DataTypes.UUID, allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
    rationale: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'redline_decisions',
    indexes: [
      { fields: ['comparison_id'] },
      { unique: true, fields: ['comparison_id', 'clause_key'] },
    ],
  },
);

module.exports = RedlineDecision;
