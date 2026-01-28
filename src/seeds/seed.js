const { sequelize } = require('../config/database');
const {
  User,
  Document,
  DocumentPage,
  ProcessingJob,
  Comparison,
  ExtractedTable,
  FormField
} = require('../models');

const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Starting database seed...');

  try {
    // Sync database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');

    // Check if already seeded
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('Database already seeded. Skipping...');
      return;
    }

    // ==================== USERS (15) ====================
    console.log('Seeding users...');

    const users = await User.bulkCreate([
      { email: 'demo@pdfgenius.com', password_hash: await bcrypt.hash('demo123', 12), name: 'Demo User', role: 'user' },
      { email: 'admin@pdfgenius.com', password_hash: await bcrypt.hash('admin123', 12), name: 'Admin User', role: 'admin' },
      { email: 'john.doe@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'John Doe', role: 'user' },
      { email: 'jane.smith@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Jane Smith', role: 'user' },
      { email: 'mike.johnson@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Mike Johnson', role: 'user' },
      { email: 'sarah.williams@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Sarah Williams', role: 'user' },
      { email: 'david.brown@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'David Brown', role: 'user' },
      { email: 'emily.davis@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Emily Davis', role: 'user' },
      { email: 'chris.miller@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Chris Miller', role: 'user' },
      { email: 'lisa.wilson@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Lisa Wilson', role: 'user' },
      { email: 'tom.moore@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Tom Moore', role: 'user' },
      { email: 'amy.taylor@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Amy Taylor', role: 'user' },
      { email: 'ryan.anderson@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Ryan Anderson', role: 'user' },
      { email: 'katie.thomas@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Katie Thomas', role: 'user' },
      { email: 'steve.jackson@example.com', password_hash: await bcrypt.hash('password123', 12), name: 'Steve Jackson', role: 'user' }
    ], { individualHooks: false }); // Skip hooks since passwords are pre-hashed

    console.log(`  Created ${users.length} users`);

    const demoUser = users[0];

    // ==================== DOCUMENTS (20) ====================
    console.log('Seeding documents...');

    const documentData = [
      { original_name: 'Q4_Financial_Report_2024.pdf', file_size: 2456789, mime_type: 'application/pdf', status: 'completed', total_pages: 12 },
      { original_name: 'Employee_Handbook_v3.pdf', file_size: 1234567, mime_type: 'application/pdf', status: 'completed', total_pages: 45 },
      { original_name: 'Invoice_INV-2024-001.pdf', file_size: 345678, mime_type: 'application/pdf', status: 'completed', total_pages: 2 },
      { original_name: 'Contract_ClientA_2024.pdf', file_size: 567890, mime_type: 'application/pdf', status: 'completed', total_pages: 8 },
      { original_name: 'Annual_Report_2023.pdf', file_size: 5678901, mime_type: 'application/pdf', status: 'completed', total_pages: 56 },
      { original_name: 'Meeting_Minutes_Dec2024.docx', file_size: 234567, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', status: 'completed', total_pages: 4 },
      { original_name: 'Sales_Data_Q4.xlsx', file_size: 456789, mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', status: 'completed', total_pages: 3 },
      { original_name: 'Project_Proposal.pdf', file_size: 789012, mime_type: 'application/pdf', status: 'completed', total_pages: 15 },
      { original_name: 'Tax_Form_W2_2024.pdf', file_size: 123456, mime_type: 'application/pdf', status: 'completed', total_pages: 1 },
      { original_name: 'Insurance_Policy.pdf', file_size: 890123, mime_type: 'application/pdf', status: 'completed', total_pages: 20 },
      { original_name: 'Product_Specifications.pdf', file_size: 456123, mime_type: 'application/pdf', status: 'processing', total_pages: 6 },
      { original_name: 'Research_Paper.pdf', file_size: 1567890, mime_type: 'application/pdf', status: 'pending', total_pages: 0 },
      { original_name: 'Legal_Agreement.pdf', file_size: 345123, mime_type: 'application/pdf', status: 'completed', total_pages: 10 },
      { original_name: 'Marketing_Plan_2025.pptx', file_size: 2345678, mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', status: 'completed', total_pages: 25 },
      { original_name: 'Budget_Forecast.xlsx', file_size: 567123, mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', status: 'completed', total_pages: 5 },
      { original_name: 'Medical_Records.pdf', file_size: 234123, mime_type: 'application/pdf', status: 'failed', total_pages: 0 },
      { original_name: 'Training_Manual.pdf', file_size: 3456789, mime_type: 'application/pdf', status: 'completed', total_pages: 78 },
      { original_name: 'Expense_Report_Nov.pdf', file_size: 189012, mime_type: 'application/pdf', status: 'completed', total_pages: 3 },
      { original_name: 'Client_Presentation.pptx', file_size: 4567890, mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', status: 'completed', total_pages: 32 },
      { original_name: 'NDA_Template.pdf', file_size: 156789, mime_type: 'application/pdf', status: 'completed', total_pages: 4 }
    ];

    const documents = await Document.bulkCreate(
      documentData.map(doc => ({
        ...doc,
        user_id: demoUser.id,
        metadata: { source: 'seed' }
      }))
    );

    console.log(`  Created ${documents.length} documents`);

    // ==================== DOCUMENT PAGES (60+) ====================
    console.log('Seeding document pages...');

    const pagePromises = [];
    for (const doc of documents.filter(d => d.status === 'completed' && d.total_pages > 0)) {
      for (let i = 1; i <= Math.min(doc.total_pages, 5); i++) { // Max 5 pages per doc for seed
        pagePromises.push(DocumentPage.create({
          document_id: doc.id,
          page_number: i,
          has_tables: Math.random() > 0.7,
          has_forms: Math.random() > 0.8,
          extracted_text: `Sample extracted text from page ${i} of ${doc.original_name}. This is demonstration content for the PDFGenius application.`,
          extracted_data: {
            title: `Page ${i}`,
            content: `Sample content for ${doc.original_name}`,
            metadata: { pageNumber: i }
          },
          confidence_score: (75 + Math.random() * 20).toFixed(2)
        }));
      }
    }

    const pages = await Promise.all(pagePromises);
    console.log(`  Created ${pages.length} document pages`);

    // ==================== PROCESSING JOBS (20) ====================
    console.log('Seeding processing jobs...');

    const jobTypes = ['convert', 'analyze', 'extract_tables', 'extract_forms', 'summarize'];
    const jobStatuses = ['completed', 'completed', 'completed', 'failed', 'queued'];

    const jobs = await ProcessingJob.bulkCreate(
      documents.slice(0, 20).map((doc, i) => ({
        document_id: doc.id,
        job_type: jobTypes[i % jobTypes.length],
        status: jobStatuses[i % jobStatuses.length],
        progress: jobStatuses[i % jobStatuses.length] === 'completed' ? 100 : (i % 5) * 20,
        result: jobStatuses[i % jobStatuses.length] === 'completed' ? { success: true } : null,
        error: jobStatuses[i % jobStatuses.length] === 'failed' ? 'Processing timeout' : null,
        started_at: new Date(Date.now() - Math.random() * 86400000),
        completed_at: jobStatuses[i % jobStatuses.length] === 'completed' ? new Date() : null
      }))
    );

    console.log(`  Created ${jobs.length} processing jobs`);

    // ==================== COMPARISONS (15) ====================
    console.log('Seeding comparisons...');

    const completedDocs = documents.filter(d => d.status === 'completed');
    const comparisonData = [];

    for (let i = 0; i < 15 && i < completedDocs.length - 1; i++) {
      comparisonData.push({
        user_id: demoUser.id,
        document_a_id: completedDocs[i].id,
        document_b_id: completedDocs[i + 1].id,
        comparison_type: ['text', 'structural', 'semantic', 'full'][i % 4],
        similarity_score: (30 + Math.random() * 60).toFixed(2),
        differences_count: Math.floor(Math.random() * 50),
        status: 'completed',
        result: {
          type: ['text', 'structural', 'semantic', 'full'][i % 4],
          summary: 'Documents have been compared successfully.'
        }
      });
    }

    const comparisons = await Comparison.bulkCreate(comparisonData);
    console.log(`  Created ${comparisons.length} comparisons`);

    // ==================== EXTRACTED TABLES (15) ====================
    console.log('Seeding extracted tables...');

    const tableData = [
      { headers: ['Product', 'Quantity', 'Price', 'Total'], rows: [['Widget A', '100', '$10.00', '$1,000'], ['Widget B', '50', '$25.00', '$1,250'], ['Widget C', '200', '$5.00', '$1,000']] },
      { headers: ['Employee', 'Department', 'Salary', 'Start Date'], rows: [['John Smith', 'Engineering', '$85,000', '2020-01-15'], ['Jane Doe', 'Marketing', '$72,000', '2019-06-01']] },
      { headers: ['Invoice #', 'Client', 'Amount', 'Status'], rows: [['INV-001', 'Acme Corp', '$5,000', 'Paid'], ['INV-002', 'Global Inc', '$3,500', 'Pending']] },
      { headers: ['Date', 'Description', 'Debit', 'Credit'], rows: [['2024-01-01', 'Opening Balance', '', '$10,000'], ['2024-01-15', 'Purchase', '$500', '']] },
      { headers: ['Item', 'SKU', 'Stock', 'Reorder Level'], rows: [['Laptop', 'LAP-001', '45', '20'], ['Mouse', 'MOU-002', '150', '50']] },
      { headers: ['Month', 'Revenue', 'Expenses', 'Profit'], rows: [['January', '$50,000', '$35,000', '$15,000'], ['February', '$55,000', '$38,000', '$17,000']] },
      { headers: ['Name', 'Email', 'Phone', 'City'], rows: [['Bob Jones', 'bob@email.com', '555-1234', 'New York']] },
      { headers: ['Project', 'Manager', 'Status', 'Deadline'], rows: [['Alpha', 'Sarah', 'In Progress', '2024-03-01'], ['Beta', 'Mike', 'Planning', '2024-04-15']] },
      { headers: ['Category', 'Budget', 'Actual', 'Variance'], rows: [['Marketing', '$20,000', '$18,500', '$1,500'], ['IT', '$35,000', '$37,000', '-$2,000']] },
      { headers: ['Vendor', 'Service', 'Contract Value', 'Renewal'], rows: [['AWS', 'Cloud', '$12,000/yr', '2025-01'], ['Salesforce', 'CRM', '$8,000/yr', '2024-12']] },
      { headers: ['Test Case', 'Status', 'Priority', 'Assignee'], rows: [['TC-001', 'Passed', 'High', 'QA Team'], ['TC-002', 'Failed', 'Critical', 'Dev Team']] },
      { headers: ['Asset', 'Type', 'Value', 'Location'], rows: [['Server #1', 'Hardware', '$5,000', 'Data Center'], ['Desk #42', 'Furniture', '$300', 'Office A']] },
      { headers: ['Metric', 'Q1', 'Q2', 'Q3', 'Q4'], rows: [['Users', '1000', '1200', '1500', '1800'], ['Revenue', '$10K', '$12K', '$15K', '$18K']] },
      { headers: ['Country', 'Sales', 'Growth', 'Market Share'], rows: [['USA', '$1M', '15%', '35%'], ['UK', '$500K', '10%', '20%']] },
      { headers: ['Feature', 'Version', 'Status', 'Notes'], rows: [['Login', 'v2.0', 'Released', 'SSO support'], ['Dashboard', 'v2.1', 'Beta', 'New charts']] }
    ];

    const tables = await ExtractedTable.bulkCreate(
      tableData.map((table, i) => ({
        document_id: completedDocs[i % completedDocs.length].id,
        page_number: 1,
        table_index: 0,
        headers: table.headers,
        rows: table.rows,
        raw_data: JSON.stringify(table),
        confidence: (80 + Math.random() * 15).toFixed(2),
        row_count: table.rows.length,
        column_count: table.headers.length
      }))
    );

    console.log(`  Created ${tables.length} extracted tables`);

    // ==================== FORM FIELDS (50+) ====================
    console.log('Seeding form fields...');

    const formFieldsData = [
      { field_name: 'First Name', field_type: 'text', field_value: 'John' },
      { field_name: 'Last Name', field_type: 'text', field_value: 'Smith' },
      { field_name: 'Email Address', field_type: 'text', field_value: 'john.smith@email.com' },
      { field_name: 'Phone Number', field_type: 'number', field_value: '555-123-4567' },
      { field_name: 'Date of Birth', field_type: 'date', field_value: '1985-03-15' },
      { field_name: 'Social Security Number', field_type: 'text', field_value: 'XXX-XX-1234' },
      { field_name: 'Address Line 1', field_type: 'text', field_value: '123 Main Street' },
      { field_name: 'Address Line 2', field_type: 'text', field_value: 'Apt 4B' },
      { field_name: 'City', field_type: 'text', field_value: 'New York' },
      { field_name: 'State', field_type: 'dropdown', field_value: 'NY' },
      { field_name: 'ZIP Code', field_type: 'number', field_value: '10001' },
      { field_name: 'I agree to terms', field_type: 'checkbox', field_value: 'true' },
      { field_name: 'Subscribe to newsletter', field_type: 'checkbox', field_value: 'false' },
      { field_name: 'Signature', field_type: 'signature', field_value: '[signature]' },
      { field_name: 'Date Signed', field_type: 'date', field_value: '2024-12-01' },
      { field_name: 'Company Name', field_type: 'text', field_value: 'Acme Corporation' },
      { field_name: 'Job Title', field_type: 'text', field_value: 'Senior Manager' },
      { field_name: 'Department', field_type: 'dropdown', field_value: 'Engineering' },
      { field_name: 'Employee ID', field_type: 'text', field_value: 'EMP-12345' },
      { field_name: 'Start Date', field_type: 'date', field_value: '2020-01-15' },
      { field_name: 'Annual Salary', field_type: 'number', field_value: '85000' },
      { field_name: 'Manager Name', field_type: 'text', field_value: 'Sarah Johnson' },
      { field_name: 'Emergency Contact', field_type: 'text', field_value: 'Jane Smith' },
      { field_name: 'Emergency Phone', field_type: 'number', field_value: '555-987-6543' },
      { field_name: 'Blood Type', field_type: 'dropdown', field_value: 'A+' },
      { field_name: 'Allergies', field_type: 'text', field_value: 'None' },
      { field_name: 'Insurance Provider', field_type: 'text', field_value: 'Blue Cross' },
      { field_name: 'Policy Number', field_type: 'text', field_value: 'POL-789456' },
      { field_name: 'Beneficiary Name', field_type: 'text', field_value: 'Jane Smith' },
      { field_name: 'Relationship', field_type: 'dropdown', field_value: 'Spouse' },
      { field_name: 'Account Number', field_type: 'text', field_value: '****1234' },
      { field_name: 'Routing Number', field_type: 'text', field_value: '****5678' },
      { field_name: 'Bank Name', field_type: 'text', field_value: 'First National Bank' },
      { field_name: 'Account Type', field_type: 'radio', field_value: 'Checking' },
      { field_name: 'Direct Deposit', field_type: 'checkbox', field_value: 'true' },
      { field_name: 'Tax Filing Status', field_type: 'dropdown', field_value: 'Married Filing Jointly' },
      { field_name: 'Allowances', field_type: 'number', field_value: '2' },
      { field_name: 'Additional Withholding', field_type: 'number', field_value: '0' },
      { field_name: 'Exempt', field_type: 'checkbox', field_value: 'false' },
      { field_name: 'Previous Employer', field_type: 'text', field_value: 'Tech Corp' },
      { field_name: 'Reason for Leaving', field_type: 'text', field_value: 'Career Growth' },
      { field_name: 'Reference Name', field_type: 'text', field_value: 'Bob Wilson' },
      { field_name: 'Reference Phone', field_type: 'number', field_value: '555-456-7890' },
      { field_name: 'Reference Relationship', field_type: 'text', field_value: 'Former Manager' },
      { field_name: 'Degree', field_type: 'text', field_value: 'Bachelor of Science' },
      { field_name: 'University', field_type: 'text', field_value: 'State University' },
      { field_name: 'Graduation Year', field_type: 'number', field_value: '2008' },
      { field_name: 'Certifications', field_type: 'text', field_value: 'PMP, AWS Certified' },
      { field_name: 'Skills', field_type: 'text', field_value: 'Project Management, Cloud Architecture' },
      { field_name: 'Authorization', field_type: 'signature', field_value: '[signature]' }
    ];

    const formFields = await FormField.bulkCreate(
      formFieldsData.map((field, i) => ({
        ...field,
        document_id: completedDocs[i % Math.min(10, completedDocs.length)].id,
        page_number: 1,
        confidence: (75 + Math.random() * 20).toFixed(2),
        is_required: Math.random() > 0.7
      }))
    );

    console.log(`  Created ${formFields.length} form fields`);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Document Pages: ${pages.length}`);
    console.log(`   - Processing Jobs: ${jobs.length}`);
    console.log(`   - Comparisons: ${comparisons.length}`);
    console.log(`   - Extracted Tables: ${tables.length}`);
    console.log(`   - Form Fields: ${formFields.length}`);
    console.log('\n🔑 Demo Login:');
    console.log('   Email: demo@pdfgenius.com');
    console.log('   Password: demo123');

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seed;
