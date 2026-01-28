import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';
import './index.css';

function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pdf');
  const [selectedPage, setSelectedPage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Fetch document details
  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/documents/${id}`);
      const data = await response.json();

      if (response.ok) {
        setDocument(data.document);
      } else {
        throw new Error(data.message || 'Failed to fetch document');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  // Fetch PDF URL
  const fetchPdfUrl = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      // Set the PDF URL with auth token as query param for iframe
      setPdfUrl(`${apiUrl}/api/documents/${id}/download?token=${token}`);
    } catch (err) {
      console.error('Failed to get PDF URL:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
    fetchPdfUrl();
  }, [fetchDocument, fetchPdfUrl]);

  // Process document
  const handleProcess = async (model = 'openai/gpt-4o') => {
    setProcessing(true);

    try {
      const response = await authFetch(`/api/documents/${id}/process`, {
        method: 'POST',
        body: JSON.stringify({ model })
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh document
        await fetchDocument();
      } else {
        throw new Error(data.message || 'Processing failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Delete document
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await authFetch(`/api/documents/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        navigate('/documents');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Page columns
  const pageColumns = [
    { key: 'page_number', label: 'Page #', width: '80px' },
    {
      key: 'has_tables',
      label: 'Tables',
      width: '80px',
      render: (v) => v ? '✓' : '-'
    },
    {
      key: 'has_forms',
      label: 'Forms',
      width: '80px',
      render: (v) => v ? '✓' : '-'
    },
    {
      key: 'confidence_score',
      label: 'Confidence',
      width: '100px',
      render: (v) => v ? `${v}%` : '-'
    },
    {
      key: 'extracted_text',
      label: 'Preview',
      render: (v) => v ? `${v.substring(0, 100)}...` : '-'
    }
  ];

  // Job columns
  const jobColumns = [
    { key: 'job_type', label: 'Type' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'progress', label: 'Progress', render: (v) => `${v}%` },
    { key: 'created_at', label: 'Created', type: 'datetime' },
    { key: 'completed_at', label: 'Completed', type: 'datetime' }
  ];

  // Table columns
  const tableColumns = [
    { key: 'page_number', label: 'Page', width: '80px' },
    { key: 'table_index', label: 'Index', width: '80px' },
    { key: 'column_count', label: 'Columns', width: '80px' },
    { key: 'row_count', label: 'Rows', width: '80px' },
    { key: 'confidence', label: 'Confidence', render: (v) => `${v}%` }
  ];

  // Page detail fields
  const pageDetailFields = [
    { key: 'page_number', label: 'Page Number' },
    { key: 'has_tables', label: 'Has Tables', render: (v) => v ? 'Yes' : 'No' },
    { key: 'has_forms', label: 'Has Forms', render: (v) => v ? 'Yes' : 'No' },
    { key: 'confidence_score', label: 'Confidence', render: (v) => v ? `${v}%` : '-' },
    { key: 'extracted_text', label: 'Extracted Text', fullWidth: true }
  ];

  if (loading) {
    return (
      <div className="document-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-detail-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/documents')}>Back to Documents</button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="document-detail-page">
        <div className="error-container">
          <h2>Document Not Found</h2>
          <button onClick={() => navigate('/documents')}>Back to Documents</button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-detail-page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/documents')}>
          ← Back
        </button>
        <div className="header-content">
          <h1>{document.original_name}</h1>
          <span className={`status-badge status-${document.status}`}>
            {document.status}
          </span>
        </div>
        <div className="header-actions">
          {document.status === 'pending' && (
            <button
              className="btn-primary"
              onClick={() => handleProcess()}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Process Now'}
            </button>
          )}
          <button className="btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Document Info */}
      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">File Size</span>
          <span className="info-value">{formatFileSize(document.file_size)}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Pages</span>
          <span className="info-value">{document.total_pages || '-'}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Type</span>
          <span className="info-value">{document.mime_type?.split('/')[1] || '-'}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Uploaded</span>
          <span className="info-value">
            {new Date(document.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={activeTab === 'pdf' ? 'active' : ''}
          onClick={() => setActiveTab('pdf')}
        >
          View PDF
        </button>
        <button
          className={activeTab === 'pages' ? 'active' : ''}
          onClick={() => setActiveTab('pages')}
        >
          Pages ({document.pages?.length || 0})
        </button>
        <button
          className={activeTab === 'jobs' ? 'active' : ''}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs ({document.jobs?.length || 0})
        </button>
        <button
          className={activeTab === 'tables' ? 'active' : ''}
          onClick={() => setActiveTab('tables')}
        >
          Tables ({document.tables?.length || 0})
        </button>
        <button
          className={activeTab === 'forms' ? 'active' : ''}
          onClick={() => setActiveTab('forms')}
        >
          Form Fields ({document.formFields?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'pdf' && (
          <div className="pdf-viewer-container">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={document.original_name}
                className="pdf-viewer"
              />
            ) : (
              <div className="pdf-loading">
                <div className="spinner"></div>
                <p>Loading PDF...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pages' && (
          <DataTable
            data={document.pages || []}
            columns={pageColumns}
            onRowClick={setSelectedPage}
            emptyMessage="No pages extracted yet"
            searchable={false}
          />
        )}

        {activeTab === 'jobs' && (
          <DataTable
            data={document.jobs || []}
            columns={jobColumns}
            emptyMessage="No processing jobs"
            searchable={false}
          />
        )}

        {activeTab === 'tables' && (
          <DataTable
            data={document.tables || []}
            columns={tableColumns}
            emptyMessage="No tables extracted"
            searchable={false}
          />
        )}

        {activeTab === 'forms' && (
          <div className="form-fields-grid">
            {document.formFields?.length > 0 ? (
              document.formFields.map(field => (
                <div key={field.id} className="form-field-card">
                  <div className="field-name">{field.field_name}</div>
                  <div className="field-type">{field.field_type}</div>
                  <div className="field-value">{field.field_value || '-'}</div>
                </div>
              ))
            ) : (
              <p className="empty-message">No form fields extracted</p>
            )}
          </div>
        )}
      </div>

      {/* Page Detail Modal */}
      <DetailModal
        isOpen={!!selectedPage}
        onClose={() => setSelectedPage(null)}
        title={`Page ${selectedPage?.page_number} Details`}
        data={selectedPage}
        fields={pageDetailFields}
        actions={[
          { label: 'Close', onClick: () => setSelectedPage(null) }
        ]}
      />
    </div>
  );
}

export default DocumentDetail;
