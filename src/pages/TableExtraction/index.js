import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';
import './index.css';

function TableExtraction() {
  const { authFetch } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [error, setError] = useState(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents?limit=100');
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Fetch tables for selected document
  const fetchTables = useCallback(async (docId) => {
    if (!docId) {
      setTables([]);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`/api/extract/tables/${docId}`);
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (selectedDocId) {
      fetchTables(selectedDocId);
    }
  }, [selectedDocId, fetchTables]);

  // Extract tables
  const handleExtract = async () => {
    if (!selectedDocId) {
      setError('Please select a document');
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const response = await authFetch(`/api/extract/tables/${selectedDocId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setTables(data.tables);
      } else {
        throw new Error(data.message || 'Extraction failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  // Export table
  const handleExport = async (table, format) => {
    try {
      const response = await authFetch(`/api/extract/tables/${table.id}/export`, {
        method: 'POST',
        body: JSON.stringify({ format })
      });

      if (format === 'csv') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        downloadBlob(blob, `table_${table.id}.csv`);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `table_${table.id}.json`);
      }
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
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

  // Table columns
  const columns = [
    { key: 'page_number', label: 'Page', width: '80px' },
    { key: 'table_index', label: 'Index', width: '80px' },
    { key: 'column_count', label: 'Columns', width: '100px' },
    { key: 'row_count', label: 'Rows', width: '100px' },
    {
      key: 'headers',
      label: 'Headers',
      render: (v) => v?.slice(0, 3).join(', ') + (v?.length > 3 ? '...' : '') || '-'
    },
    {
      key: 'confidence',
      label: 'Confidence',
      width: '120px',
      render: (v) => v ? `${v}%` : '-'
    }
  ];

  return (
    <div className="table-extraction-page">
      <div className="page-header">
        <div>
          <h1>Table Extraction</h1>
          <p className="page-description">Extract and export tables from your documents</p>
        </div>
      </div>

      {/* Document Selection */}
      <div className="extraction-controls">
        <div className="control-group">
          <label>Select Document</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            disabled={extracting}
          >
            <option value="">Choose a document...</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.original_name} ({doc.total_pages || 0} pages) - {doc.status}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-primary"
          onClick={handleExtract}
          disabled={!selectedDocId || extracting}
        >
          {extracting ? 'Extracting...' : 'Extract Tables'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Tables List */}
      {selectedDocId && (
        <div className="tables-section">
          <h3>Extracted Tables ({tables.length})</h3>
          <DataTable
            data={tables}
            columns={columns}
            loading={loading}
            onRowClick={setSelectedTable}
            emptyMessage="No tables found. Click 'Extract Tables' to analyze the document."
            searchable={false}
          />
        </div>
      )}

      {/* Table Preview Modal */}
      <DetailModal
        isOpen={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        title={`Table Preview - Page ${selectedTable?.page_number}`}
        size="large"
        actions={[
          { label: 'Export CSV', variant: 'default', onClick: () => handleExport(selectedTable, 'csv') },
          { label: 'Export JSON', variant: 'default', onClick: () => handleExport(selectedTable, 'json') },
          { label: 'Close', variant: 'primary', onClick: () => setSelectedTable(null) }
        ]}
      >
        {selectedTable && (
          <div className="table-preview">
            <div className="table-meta">
              <span>Page {selectedTable.page_number}</span>
              <span>{selectedTable.column_count} columns</span>
              <span>{selectedTable.row_count} rows</span>
              <span>{selectedTable.confidence}% confidence</span>
            </div>

            <div className="table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {selectedTable.headers?.map((header, i) => (
                      <th key={i}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTable.rows?.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default TableExtraction;
