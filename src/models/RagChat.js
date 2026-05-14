const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RagChat = sequelize.define(
  'RagChat',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    document_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
    title: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'rag_chats', indexes: [{ fields: ['user_id'] }] },
);

const RagMessage = sequelize.define(
  'RagMessage',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    chat_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'assistant', 'system'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    citations: { type: DataTypes.JSONB, defaultValue: [] },
    model: { type: DataTypes.STRING(200), allowNull: true },
    tokens_in: { type: DataTypes.INTEGER, allowNull: true },
    tokens_out: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'rag_messages', indexes: [{ fields: ['chat_id'] }] },
);

RagChat.hasMany(RagMessage, { foreignKey: 'chat_id', as: 'messages', onDelete: 'CASCADE' });
RagMessage.belongsTo(RagChat, { foreignKey: 'chat_id', as: 'chat' });

module.exports = { RagChat, RagMessage };
