const fs = require('fs');
const path = require('path');

class DocumentProcessor {
  constructor() {
    this.inputFile = '';
    this.outputFile = '';
  }

  // Read JSON file
  readFile(filePath) {
    try {
      console.log(`Reading file: ${filePath}`);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      throw error;
    }
  }

  // Write JSON file
  writeFile(filePath, data) {
    try {
      console.log(`Writing file: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`File written successfully: ${filePath}`);
    } catch (error) {
      console.error(`Error writing file: ${error.message}`);
      throw error;
    }
  }

  // Filter empty and error documents
  // Enhanced filtering function that considers ALL meaningful fields
  // Simpler version focusing on your specific case
filterEmptyAndErrorDocs(results) {
  console.log(`Original results: ${results.length} pages`);
  
  const filtered = results.filter(item => {
    const data = item.data || {};
    
    // Remove error entries
    if (data.error) {
      console.log(`Removing page ${item.page}: Error - ${data.error}`);
      return false;
    }
    
    // Remove pages with empty content and only footer
    if (data.content === "" && data.footer && Object.keys(data).length <= 3) {
      console.log(`Removing page ${item.page}: Empty page with only footer`);
      return false;
    }
    
    // Check for any meaningful string content (excluding empty strings)
    const hasStringContent = Object.entries(data).some(([key, value]) => {
      return typeof value === 'string' && 
             value.trim() !== '' && 
             key !== 'error' &&
             !key.includes('footer') &&
             !value.match(/^Page \d+ of \d+$/); // Exclude "Page X of Y" patterns
    });
    
    // Check for meaningful arrays
    const hasArrayContent = Object.entries(data).some(([key, value]) => {
      return Array.isArray(value) && value.length > 0;
    });
    
    const hasContent = hasStringContent || hasArrayContent;
    
    if (!hasContent) {
      console.log(`Removing page ${item.page}: Empty content`);
      return false;
    }
    
    return true;
  });
  
  console.log(`Filtered results: ${filtered.length} pages`);
  return filtered;
}

// In your DocumentProcessor class

cleanJsonDocumentWithDeletedIds(jsonDoc) {
  if (!jsonDoc || !Array.isArray(jsonDoc)) {
    throw new Error("Invalid document format: 'results' array is required.");
  }

  const originalPages = new Set(jsonDoc.map(item => item.page));
  const cleanedResults = this.filterEmptyAndErrorDocs(jsonDoc);
  const cleanedPages = new Set(cleanedResults.map(item => item.page));

  // Pages that were in the original but not in the cleaned set
  const deletedPages = [...originalPages].filter(page => !cleanedPages.has(page));

  return deletedPages
}


/**
 * Cleans a JSON document by removing empty pages and error entries
 * @param {Object} jsonDoc - The JSON document with a 'results' array
 * @param {Function} filterEmptyAndErrorDocs - External filter function
 * @returns {Object} - Cleaned JSON document only
 */
cleanJsonDocument(jsonDoc) {
  if (!jsonDoc || !Array.isArray(jsonDoc)) {
    throw new Error("Invalid document format: 'results' array is required.");
  }

  // Apply the external filter function and return only cleaned document
  const cleanedResults = this.filterEmptyAndErrorDocs(jsonDoc);
  
  return cleanedResults;
}

  // Main processing function
  processDocument(inputPath, outputPath) {
    try {
      // Read the input file
      const documentData = this.readFile(inputPath);
      
      // Extract results array (assuming it's in a 'results' field)
      let results = documentData.results || documentData;
      
      if (!Array.isArray(results)) {
        throw new Error('Input data must contain an array of results');
      }

      // Filter empty and error documents
      const cleanedResults = this.filterEmptyAndErrorDocs(results);
      
      // Create output data structure
      const outputData = {
        ...documentData,
        results: cleanedResults,
        processing_summary: {
          original_count: results.length,
          filtered_count: cleanedResults.length,
          removed_count: results.length - cleanedResults.length,
          processed_at: new Date().toISOString()
        }
      };
      
      // Write the cleaned data
      this.writeFile(outputPath, outputData);
      
      console.log('\n=== Processing Summary ===');
      console.log(`Original pages: ${results.length}`);
      console.log(`Cleaned pages: ${cleanedResults.length}`);
      console.log(`Removed pages: ${results.length - cleanedResults.length}`);
      console.log(`Success rate: ${((cleanedResults.length / results.length) * 100).toFixed(1)}%`);
      
      return outputData;
      
    } catch (error) {
      console.error(`Processing failed: ${error.message}`);
      throw error;
    }
  }

  // Validate file paths
  validatePaths(inputPath, outputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }
}

// Main execution function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node document_processor.js <input_file> <output_file>');
    console.log('Example: node document_processor.js results.json cleaned_results.json');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  const processor = new DocumentProcessor();
  
  try {
    // Validate file paths
    processor.validatePaths(inputFile, outputFile);
    
    // Process the document
    const result = processor.processDocument(inputFile, outputFile);
    
    console.log('\n✅ Document processing completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Document processing failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = DocumentProcessor;


