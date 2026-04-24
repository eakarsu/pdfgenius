const { sequelize } = require('../config/database');
const User = require('./User');
const Document = require('./Document');
const DocumentPage = require('./DocumentPage');
const ProcessingJob = require('./ProcessingJob');
const Comparison = require('./Comparison');
const ExtractedTable = require('./ExtractedTable');
const FormField = require('./FormField');
const PasswordResetToken = require('./PasswordResetToken');
const Permission = require('./Permission');

// Define associations

// User -> Documents (one-to-many)
User.hasMany(Document, { foreignKey: 'user_id', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Document -> DocumentPages (one-to-many)
Document.hasMany(DocumentPage, { foreignKey: 'document_id', as: 'pages', onDelete: 'CASCADE' });
DocumentPage.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

// Document -> ProcessingJobs (one-to-many)
Document.hasMany(ProcessingJob, { foreignKey: 'document_id', as: 'jobs' });
ProcessingJob.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

// User -> Comparisons (one-to-many)
User.hasMany(Comparison, { foreignKey: 'user_id', as: 'comparisons' });
Comparison.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Document <-> Comparisons (many-to-many through comparison)
Document.hasMany(Comparison, { foreignKey: 'document_a_id', as: 'comparisonsAsA' });
Document.hasMany(Comparison, { foreignKey: 'document_b_id', as: 'comparisonsAsB' });
Comparison.belongsTo(Document, { foreignKey: 'document_a_id', as: 'documentA' });
Comparison.belongsTo(Document, { foreignKey: 'document_b_id', as: 'documentB' });

// Document -> ExtractedTables (one-to-many)
Document.hasMany(ExtractedTable, { foreignKey: 'document_id', as: 'tables', onDelete: 'CASCADE' });
ExtractedTable.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

// Document -> FormFields (one-to-many)
Document.hasMany(FormField, { foreignKey: 'document_id', as: 'formFields', onDelete: 'CASCADE' });
FormField.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

// User -> PasswordResetTokens (one-to-many)
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'resetTokens', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sync function with options
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Document,
  DocumentPage,
  ProcessingJob,
  Comparison,
  ExtractedTable,
  FormField,
  PasswordResetToken,
  Permission,
  syncDatabase
};
