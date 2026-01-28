const { Document, DocumentPage, FormField } = require('../models');

class FormService {
  /**
   * Extract form fields from document
   */
  async extractFormFields(documentId) {
    const document = await Document.findByPk(documentId, {
      include: ['pages']
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const extractedFields = [];

    for (const page of document.pages || []) {
      const pageFields = await this.extractFieldsFromPage(documentId, page);
      extractedFields.push(...pageFields);
    }

    // Update document pages to mark forms found
    for (const page of document.pages || []) {
      const hasForms = extractedFields.some(f => f.page_number === page.page_number);
      if (hasForms !== page.has_forms) {
        await page.update({ has_forms: hasForms });
      }
    }

    return extractedFields;
  }

  /**
   * Extract form fields from a single page
   */
  async extractFieldsFromPage(documentId, page) {
    const fields = [];

    const extractedData = page.extracted_data || {};
    const extractedText = page.extracted_text || '';

    // Check if page data already has form fields
    if (extractedData.formFields && Array.isArray(extractedData.formFields)) {
      for (const field of extractedData.formFields) {
        const formField = await FormField.create({
          document_id: documentId,
          page_number: page.page_number,
          field_name: field.name || 'Unknown Field',
          field_type: this.classifyFieldType(field),
          field_value: field.value || null,
          bounding_box: field.boundingBox || null,
          confidence: field.confidence || 80,
          is_required: field.required || false
        });
        fields.push(formField);
      }
      return fields;
    }

    // Detect form patterns from text
    const detectedFields = this.detectFormPatterns(extractedText);

    for (const field of detectedFields) {
      const formField = await FormField.create({
        document_id: documentId,
        page_number: page.page_number,
        field_name: field.name,
        field_type: field.type,
        field_value: field.value,
        confidence: field.confidence,
        is_required: field.required
      });
      fields.push(formField);
    }

    return fields;
  }

  /**
   * Classify field type based on field data
   */
  classifyFieldType(field) {
    if (field.type) {
      const type = field.type.toLowerCase();
      if (['text', 'checkbox', 'radio', 'signature', 'date', 'number', 'dropdown'].includes(type)) {
        return type;
      }
    }

    // Classify based on name
    const name = (field.name || '').toLowerCase();

    if (name.includes('date') || name.includes('dob') || name.includes('birth')) {
      return 'date';
    }
    if (name.includes('sign') || name.includes('signature')) {
      return 'signature';
    }
    if (name.includes('check') || name.includes('agree') || name.includes('confirm')) {
      return 'checkbox';
    }
    if (name.includes('phone') || name.includes('zip') || name.includes('amount') || name.includes('number')) {
      return 'number';
    }
    if (name.includes('select') || name.includes('choose') || name.includes('option')) {
      return 'dropdown';
    }

    return 'text';
  }

  /**
   * Detect form patterns from text
   */
  detectFormPatterns(text) {
    const fields = [];
    const lines = text.split('\n');

    // Common form field patterns
    const patterns = [
      // Label: Value format
      { regex: /^(.+?):\s*(.*)$/i, type: 'text' },
      // Label _____ (underline/blank)
      { regex: /^(.+?)[_\s]{3,}(.*)$/i, type: 'text' },
      // [ ] Checkbox or [x] Checkbox
      { regex: /^\[([x\s]?)\]\s*(.+)$/i, type: 'checkbox' },
      // Date patterns
      { regex: /^(.+?date.*):\s*(.*)$/i, type: 'date' },
      // Signature line
      { regex: /^(.+?signature.*):\s*(.*)$/i, type: 'signature' }
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern.regex);
        if (match) {
          fields.push({
            name: match[1].trim(),
            value: match[2]?.trim() || null,
            type: pattern.type,
            confidence: 70,
            required: trimmedLine.includes('*') || trimmedLine.toLowerCase().includes('required')
          });
          break;
        }
      }
    }

    return fields;
  }

  /**
   * Get form fields for a document
   */
  async getDocumentFormFields(documentId) {
    return FormField.findAll({
      where: { document_id: documentId },
      order: [['page_number', 'ASC'], ['created_at', 'ASC']]
    });
  }

  /**
   * Get single form field by ID
   */
  async getFormField(fieldId) {
    return FormField.findByPk(fieldId, {
      include: ['document']
    });
  }

  /**
   * Update form field value
   */
  async updateFormField(fieldId, updates) {
    const field = await FormField.findByPk(fieldId);
    if (!field) {
      throw new Error('Form field not found');
    }

    const allowedUpdates = ['field_value', 'field_name', 'field_type', 'is_required'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    await field.update(filteredUpdates);
    return field;
  }

  /**
   * Export form fields to JSON
   */
  exportToJSON(fields) {
    return fields.map(field => ({
      name: field.field_name,
      type: field.field_type,
      value: field.field_value,
      required: field.is_required,
      page: field.page_number,
      confidence: field.confidence
    }));
  }

  /**
   * Export form fields to flat object (key-value pairs)
   */
  exportToFlatJSON(fields) {
    const result = {};
    for (const field of fields) {
      result[field.field_name] = field.field_value;
    }
    return result;
  }

  /**
   * Export form fields to CSV
   */
  exportToCSV(fields) {
    const escapeCSV = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Field Name', 'Type', 'Value', 'Page', 'Required', 'Confidence'];
    const rows = fields.map(f => [
      escapeCSV(f.field_name),
      escapeCSV(f.field_type),
      escapeCSV(f.field_value),
      f.page_number,
      f.is_required ? 'Yes' : 'No',
      f.confidence
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Delete form field
   */
  async deleteFormField(fieldId) {
    const field = await FormField.findByPk(fieldId);
    if (!field) {
      throw new Error('Form field not found');
    }
    await field.destroy();
    return { deleted: true };
  }

  /**
   * Bulk update form fields (for form filling)
   */
  async bulkUpdateFields(updates) {
    const results = [];

    for (const update of updates) {
      const field = await FormField.findByPk(update.id);
      if (field) {
        await field.update({ field_value: update.value });
        results.push({ id: update.id, success: true });
      } else {
        results.push({ id: update.id, success: false, error: 'Not found' });
      }
    }

    return results;
  }
}

module.exports = new FormService();
