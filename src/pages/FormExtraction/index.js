import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmContext';
import DetailModal from '../../components/DetailModal';
import { exportToCSV } from '../../utils/export.util';
import './index.css';

function FormExtraction() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents?status=completed&limit=100');
      const data = await response.json();
      if (response.ok) setDocuments(data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const fetchFormFields = useCallback(async (docId) => {
    if (!docId) { setFormFields([]); return; }
    setLoading(true);
    try {
      const response = await authFetch(`/api/extract/forms/${docId}`);
      const data = await response.json();
      if (response.ok) setFormFields(data.fields);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (selectedDocId) fetchFormFields(selectedDocId);
  }, [selectedDocId, fetchFormFields]);

  const handleExtract = async () => {
    if (!selectedDocId) { toast.warning('Please select a document'); return; }
    setExtracting(true);
    setError(null);
    try {
      const response = await authFetch(`/api/extract/forms/${selectedDocId}`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setFormFields(data.fields);
        toast.success(`${data.fields.length} form field(s) extracted`);
      } else {
        throw new Error(data.message || 'Extraction failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleUpdateField = async (fieldId, newValue) => {
    try {
      const response = await authFetch(`/api/extract/forms/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify({ field_value: newValue })
      });
      if (response.ok) {
        setFormFields(prev => prev.map(f => f.id === fieldId ? { ...f, field_value: newValue } : f));
        setEditingField(null);
        toast.success('Field updated');
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteField = async (field) => {
    const confirmed = await confirm({
      title: 'Delete Field',
      message: `Delete "${field.field_name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/extract/forms/${field.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Field deleted');
        setFormFields(prev => prev.filter(f => f.id !== field.id));
        setSelectedField(null);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExport = async (format) => {
    if (!selectedDocId) return;
    try {
      const response = await authFetch(`/api/extract/forms/${selectedDocId}/export`, {
        method: 'POST',
        body: JSON.stringify({ format })
      });
      if (format === 'csv') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        downloadBlob(blob, `form_fields_${selectedDocId}.csv`);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `form_fields_${selectedDocId}.json`);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  const handleExportAllCSV = () => {
    exportToCSV(formFields, [
      { key: 'field_name', label: 'Field Name' },
      { key: 'field_type', label: 'Type' },
      { key: 'field_value', label: 'Value' },
      { key: 'page_number', label: 'Page' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'is_required', label: 'Required', exportRender: (v) => v ? 'Yes' : 'No' }
    ], 'form_fields.csv');
    toast.success('CSV exported');
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '\u270D', checkbox: '\u2611', radio: '\uD83D\uDD18',
      signature: '\u2712', date: '\uD83D\uDCC5', number: '\uD83D\uDD22',
      dropdown: '\uD83D\uDCCB', unknown: '?'
    };
    return icons[type] || icons.unknown;
  };

  const fieldsByPage = formFields.reduce((acc, field) => {
    const page = field.page_number || 1;
    if (!acc[page]) acc[page] = [];
    acc[page].push(field);
    return acc;
  }, {});

  return (
    <div className="form-extraction-page">
      <div className="page-header">
        <div>
          <h1>Form Extraction</h1>
          <p className="page-description">Extract and edit form fields from your documents</p>
        </div>
        <button className="btn-secondary" onClick={handleExportAllCSV} disabled={formFields.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="extraction-controls">
        <div className="control-group">
          <label>Select Document</label>
          <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} disabled={extracting}>
            <option value="">Choose a document...</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.original_name} ({doc.total_pages} pages)
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={handleExtract} disabled={!selectedDocId || extracting}>
          {extracting ? 'Extracting...' : 'Extract Form Fields'}
        </button>
        {formFields.length > 0 && (
          <div className="export-buttons">
            <button className="btn-secondary" onClick={() => handleExport('json')}>Export JSON</button>
            <button className="btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {selectedDocId && (
        <div className="fields-section">
          <h3>Form Fields ({formFields.length})</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : formFields.length === 0 ? (
            <div className="empty-state">
              <p>No form fields found. Click 'Extract Form Fields' to analyze the document.</p>
            </div>
          ) : (
            Object.entries(fieldsByPage).map(([page, fields]) => (
              <div key={page} className="page-section">
                <h4>Page {page}</h4>
                <div className="fields-grid">
                  {fields.map(field => (
                    <div
                      key={field.id}
                      className={`field-card ${field.is_required ? 'required' : ''}`}
                      onClick={() => setSelectedField(field)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="field-header">
                        <span className="field-icon">{getFieldTypeIcon(field.field_type)}</span>
                        <span className="field-name">{field.field_name}</span>
                        {field.is_required && <span className="required-badge">Required</span>}
                      </div>
                      <div className="field-type-label">{field.field_type}</div>

                      {editingField === field.id ? (
                        <div className="field-edit" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            defaultValue={field.field_value || ''}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateField(field.id, e.target.value);
                              else if (e.key === 'Escape') setEditingField(null);
                            }}
                            onBlur={(e) => handleUpdateField(field.id, e.target.value)}
                          />
                        </div>
                      ) : (
                        <div
                          className="field-value"
                          onClick={(e) => { e.stopPropagation(); setEditingField(field.id); }}
                          title="Click to edit"
                        >
                          {field.field_value || <span className="empty-value">Click to add value</span>}
                        </div>
                      )}

                      {field.confidence && (
                        <div className="field-confidence">{field.confidence}% confidence</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Field Detail Modal */}
      <DetailModal
        isOpen={!!selectedField}
        onClose={() => setSelectedField(null)}
        title={selectedField?.field_name || 'Field Details'}
        actions={[
          {
            label: 'Edit Value',
            variant: 'primary',
            onClick: () => { setEditingField(selectedField?.id); setSelectedField(null); }
          },
          {
            label: 'Delete',
            variant: 'danger',
            onClick: () => handleDeleteField(selectedField)
          },
          { label: 'Close', onClick: () => setSelectedField(null) }
        ]}
      >
        {selectedField && (
          <div className="field-detail">
            <p><strong>Field Name:</strong> {selectedField.field_name}</p>
            <p><strong>Type:</strong> {selectedField.field_type}</p>
            <p><strong>Value:</strong> {selectedField.field_value || '-'}</p>
            <p><strong>Page:</strong> {selectedField.page_number}</p>
            <p><strong>Confidence:</strong> {selectedField.confidence}%</p>
            <p><strong>Required:</strong> {selectedField.is_required ? 'Yes' : 'No'}</p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default FormExtraction;
