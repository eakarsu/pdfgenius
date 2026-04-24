const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  allowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'permissions',
  indexes: [
    {
      unique: true,
      fields: ['role', 'resource', 'action']
    }
  ]
});

module.exports = Permission;
