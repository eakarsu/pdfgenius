const { Document, DocumentPage, ExtractedTable } = require('../models');

class TableService {
  /**
   * Extract tables from document
   */
  async extractTables(documentId) {
    const document = await Document.findByPk(documentId, {
      include: ['pages']
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const extractedTables = [];

    for (const page of document.pages || []) {
      const pageTables = await this.extractTablesFromPage(documentId, page);
      extractedTables.push(...pageTables);
    }

    // Update document pages to mark tables found
    for (const page of document.pages || []) {
      const hasTables = extractedTables.some(t => t.page_number === page.page_number);
      if (hasTables !== page.has_tables) {
        await page.update({ has_tables: hasTables });
      }
    }

    return extractedTables;
  }

  /**
   * Extract tables from a single page
   */
  async extractTablesFromPage(documentId, page) {
    const tables = [];

    // Check if page has extracted data with table-like content
    const extractedData = page.extracted_data || {};
    const extractedText = page.extracted_text || '';

    // Simple table detection heuristics
    const potentialTables = this.detectTablePatterns(extractedText, extractedData);

    for (let i = 0; i < potentialTables.length; i++) {
      const tableData = potentialTables[i];

      const table = await ExtractedTable.create({
        document_id: documentId,
        page_number: page.page_number,
        table_index: i,
        headers: tableData.headers,
        rows: tableData.rows,
        raw_data: tableData.raw,
        confidence: tableData.confidence,
        row_count: tableData.rows.length,
        column_count: tableData.headers.length
      });

      tables.push(table);
    }

    return tables;
  }

  /**
   * Detect table patterns in text/data
   */
  detectTablePatterns(text, data) {
    const tables = [];

    // If data has structured table info
    if (data.tables && Array.isArray(data.tables)) {
      for (const table of data.tables) {
        tables.push({
          headers: table.headers || [],
          rows: table.rows || [],
          raw: JSON.stringify(table),
          confidence: table.confidence || 85
        });
      }
      return tables;
    }

    // Try to parse JSON from extracted_text
    let parsedData = data;
    if (typeof text === 'string' && text.startsWith('{')) {
      try {
        parsedData = JSON.parse(text);
      } catch (e) {
        // Not valid JSON, continue with text parsing
      }
    }

    // Detect table patterns from flattened key-value data (e.g., item_1, item_1_price, etc.)
    const flattenedTable = this.detectFlattenedTablePattern(parsedData);
    if (flattenedTable) {
      tables.push(flattenedTable);
    }

    // Try to detect tables from text patterns
    const lines = (typeof text === 'string' ? text : '').split('\n').filter(l => l.trim());

    // Look for delimiter-separated values
    const patterns = [
      { delimiter: '\t', name: 'tab' },
      { delimiter: '|', name: 'pipe' },
      { delimiter: ',', name: 'comma' }
    ];

    for (const pattern of patterns) {
      const potentialTable = this.parseDelimitedTable(lines, pattern.delimiter);
      if (potentialTable) {
        tables.push(potentialTable);
        break; // Use first detected pattern
      }
    }

    return tables;
  }

  /**
   * Detect table from flattened key-value patterns like item_1, item_1_price, item_2, item_2_price
   */
  detectFlattenedTablePattern(data) {
    if (!data || typeof data !== 'object') return null;

    const keys = Object.keys(data);

    // Look for patterns like: item_1, item_2, etc. or row_1, row_2, etc.
    const rowPatterns = [
      /^(item|row|line|product|entry)_(\d+)$/i,
      /^(item|row|line|product|entry)(\d+)$/i
    ];

    // Find the base pattern and collect row indices
    let basePattern = null;
    let baseName = null;
    const rowIndices = new Set();

    for (const key of keys) {
      for (const pattern of rowPatterns) {
        const match = key.match(pattern);
        if (match) {
          baseName = match[1].toLowerCase();
          rowIndices.add(parseInt(match[2]));
          basePattern = pattern;
          break;
        }
      }
      if (basePattern) break;
    }

    if (!baseName || rowIndices.size < 2) {
      // Try to detect table headers pattern
      const headerPattern = /^table_header_(\d+)$/i;
      const headers = [];

      for (const key of keys) {
        const match = key.match(headerPattern);
        if (match) {
          const idx = parseInt(match[1]) - 1;
          headers[idx] = data[key];
        }
      }

      if (headers.length >= 2) {
        // Found headers, now look for corresponding data
        // Try item_N_field pattern
        const itemData = {};
        const fieldPattern = /^item_(\d+)_?(.*)$/i;

        for (const key of keys) {
          const match = key.match(fieldPattern);
          if (match) {
            const rowNum = parseInt(match[1]);
            const field = match[2] || 'name';
            if (!itemData[rowNum]) itemData[rowNum] = {};
            itemData[rowNum][field.toLowerCase() || 'name'] = data[key];
          }
        }

        if (Object.keys(itemData).length >= 1) {
          // Build table from headers and item data
          const rows = [];
          const sortedIndices = Object.keys(itemData).map(Number).sort((a, b) => a - b);

          for (const idx of sortedIndices) {
            const rowData = itemData[idx];
            const row = headers.map((header, i) => {
              // Try to match header to field
              const headerLower = (header || '').toLowerCase();
              if (headerLower.includes('item') || headerLower.includes('name') || headerLower.includes('product')) {
                return rowData[''] || rowData['name'] || rowData[Object.keys(rowData)[0]] || '';
              }
              if (headerLower.includes('price')) {
                return rowData['price'] || '';
              }
              if (headerLower.includes('quantity') || headerLower.includes('qty')) {
                return rowData['quantity'] || rowData['qty'] || '';
              }
              if (headerLower.includes('subtotal') || headerLower.includes('total')) {
                return rowData['subtotal'] || rowData['total'] || '';
              }
              // Try exact match
              return rowData[headerLower] || Object.values(rowData)[i] || '';
            });
            rows.push(row);
          }

          if (rows.length > 0) {
            return {
              headers: headers.filter(h => h),
              rows,
              raw: JSON.stringify({ headers, rows }),
              confidence: 80
            };
          }
        }
      }

      return null;
    }

    // Collect all fields for each row
    const rowData = {};
    const allFields = new Set();

    const fieldPatterns = [
      new RegExp(`^${baseName}_(\\d+)_(.+)$`, 'i'),
      new RegExp(`^${baseName}_(\\d+)(.*)$`, 'i'),
      new RegExp(`^${baseName}(\\d+)_(.+)$`, 'i'),
      new RegExp(`^${baseName}(\\d+)(.*)$`, 'i')
    ];

    for (const key of keys) {
      for (const pattern of fieldPatterns) {
        const match = key.match(pattern);
        if (match) {
          const rowNum = parseInt(match[1]);
          const field = (match[2] || 'name').replace(/^_/, '').toLowerCase() || 'name';

          if (!rowData[rowNum]) rowData[rowNum] = {};
          rowData[rowNum][field] = data[key];
          allFields.add(field);
          break;
        }
      }
    }

    if (Object.keys(rowData).length < 2) return null;

    // Build headers from fields
    const headers = Array.from(allFields);
    const rows = [];
    const sortedIndices = Object.keys(rowData).map(Number).sort((a, b) => a - b);

    for (const idx of sortedIndices) {
      const row = headers.map(field => rowData[idx][field] || '');
      rows.push(row);
    }

    return {
      headers: headers.map(h => h.charAt(0).toUpperCase() + h.slice(1)),
      rows,
      raw: JSON.stringify({ headers, rows }),
      confidence: 75
    };
  }

  /**
   * Parse delimited table from lines
   */
  parseDelimitedTable(lines, delimiter) {
    // Find consecutive lines with similar structure
    const candidates = [];
    let currentGroup = [];

    for (const line of lines) {
      const parts = line.split(delimiter).map(p => p.trim()).filter(p => p);

      if (parts.length >= 2) {
        if (currentGroup.length === 0 || parts.length === currentGroup[0].length) {
          currentGroup.push(parts);
        } else {
          if (currentGroup.length >= 2) {
            candidates.push([...currentGroup]);
          }
          currentGroup = [parts];
        }
      } else {
        if (currentGroup.length >= 2) {
          candidates.push([...currentGroup]);
        }
        currentGroup = [];
      }
    }

    if (currentGroup.length >= 2) {
      candidates.push(currentGroup);
    }

    // Return largest table found
    if (candidates.length > 0) {
      const largest = candidates.reduce((a, b) =>
        a.length * a[0].length > b.length * b[0].length ? a : b
      );

      return {
        headers: largest[0],
        rows: largest.slice(1),
        raw: largest.map(r => r.join(delimiter)).join('\n'),
        confidence: 70 + Math.min(20, largest.length * 2)
      };
    }

    return null;
  }

  /**
   * Get tables for a document
   */
  async getDocumentTables(documentId) {
    return ExtractedTable.findAll({
      where: { document_id: documentId },
      order: [['page_number', 'ASC'], ['table_index', 'ASC']]
    });
  }

  /**
   * Get single table by ID
   */
  async getTable(tableId) {
    return ExtractedTable.findByPk(tableId, {
      include: ['document']
    });
  }

  /**
   * Update table data
   */
  async updateTable(tableId, updates) {
    const table = await ExtractedTable.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const allowedUpdates = ['headers', 'rows'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (filteredUpdates.rows) {
      filteredUpdates.row_count = filteredUpdates.rows.length;
    }
    if (filteredUpdates.headers) {
      filteredUpdates.column_count = filteredUpdates.headers.length;
    }

    await table.update(filteredUpdates);
    return table;
  }

  /**
   * Export table to CSV format
   */
  exportToCSV(table) {
    const escapeCSV = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = table.headers.map(escapeCSV).join(',');
    const dataRows = table.rows.map(row =>
      row.map(escapeCSV).join(',')
    );

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Export table to JSON format
   */
  exportToJSON(table) {
    return table.rows.map(row => {
      const obj = {};
      table.headers.forEach((header, i) => {
        obj[header] = row[i] || null;
      });
      return obj;
    });
  }

  /**
   * Delete table
   */
  async deleteTable(tableId) {
    const table = await ExtractedTable.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }
    await table.destroy();
    return { deleted: true };
  }
}

module.exports = new TableService();
