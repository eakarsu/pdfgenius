import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import DataTable from '../../components/DataTable';
import NewItemModal from '../../components/NewItemModal';
import './index.css';

function Documents() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch documents
  const fetchDocuments = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      // Add timestamp to prevent caching
      const response = await authFetch(`/api/documents?page=${page}&limit=20&_t=${Date.now()}`);
      const data = await response.json();

      console.log('Fetched documents:', data);

      if (response.ok) {
        setDocuments(data.documents || []);
        setPagination(data.pagination);
      } else {
        throw new Error(data.message || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents/stats/overview');
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  // Handle document upload
  const handleUpload = async (formData) => {
    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to upload documents');
      }

      if (!formData.file) {
        throw new Error('Please select a file to upload');
      }

      console.log('Uploading file:', formData.file.name);

      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('processNow', formData.processNow || false);
      if (formData.model) uploadData.append('model', formData.model);

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      console.log('Upload URL:', `${apiUrl}/api/documents`);

      const response = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      console.log('Upload successful, document ID:', data.document?.id);

      // Refresh documents list
      await fetchDocuments();
      await fetchStats();
      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // Handle document click
  const handleRowClick = (doc) => {
    navigate(`/documents/${doc.id}`);
  };

  // Handle delete
  const handleDelete = async (doc, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${doc.original_name}"?`)) return;

    try {
      const response = await authFetch(`/api/documents/${doc.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchDocuments();
        await fetchStats();
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

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color class
  const getStatusClass = (status) => {
    const statusClasses = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      failed: 'status-failed'
    };
    return statusClasses[status] || 'status-pending';
  };

  // Table columns
  const columns = [
    {
      key: 'original_name',
      label: 'Name',
      render: (value) => (
        <div className="doc-name">
          <span className="doc-icon">📄</span>
          {value}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '120px'
    },
    {
      key: 'total_pages',
      label: 'Pages',
      type: 'number',
      width: '80px',
      render: (value) => value || '-'
    },
    {
      key: 'file_size',
      label: 'Size',
      type: 'size',
      width: '100px'
    },
    {
      key: 'created_at',
      label: 'Uploaded',
      type: 'datetime',
      width: '180px'
    }
  ];

  // Upload form fields
  const uploadFields = [
    {
      name: 'file',
      label: 'PDF Document',
      type: 'file',
      required: true,
      accept: '.pdf'
    },
    {
      name: 'model',
      label: 'AI Model',
      type: 'select',
      options: [
        { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Recommended)' },
        { value: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4 (Fast)' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' }
      ]
    },
    {
      name: 'processNow',
      label: 'Process Immediately',
      type: 'checkbox',
      checkboxLabel: 'Start AI processing after upload',
      defaultValue: true
    }
  ];

  return (
    <div className="documents-page">
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p className="page-description">Manage your uploaded documents</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          + Upload Document
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Documents</div>
          </div>
          <div className="stat-card stat-completed">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card stat-processing">
            <div className="stat-value">{stats.processing}</div>
            <div className="stat-label">Processing</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      )}

      {/* View Toggle & Actions */}
      <div className="view-controls">
        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            Grid
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            List
          </button>
        </div>
        <button className="btn-refresh" onClick={() => fetchDocuments()}>
          Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => fetchDocuments()}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            📄
          </div>
          <h3>No documents yet</h3>
          <p>Upload your first PDF document to get started</p>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            + Upload Document
          </button>
        </div>
      )}

      {/* Grid View - Show uploaded PDF documents */}
      {!loading && documents.length > 0 && viewMode === 'grid' && (
        <div className="documents-grid">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="document-card"
              onClick={() => handleRowClick(doc)}
            >
              <div className="card-preview">
                <div className="pdf-icon-large">
                  <span role="img" aria-label="PDF">📄</span>
                </div>
              </div>
              <div className="card-info">
                <h4 className="card-title" title={doc.original_name}>
                  {doc.original_name}
                </h4>
                <div className="card-meta">
                  <span className={`card-status ${getStatusClass(doc.status)}`}>
                    {doc.status}
                  </span>
                  <span className="card-pages">
                    {doc.total_pages ? `${doc.total_pages} pages` : '-'}
                  </span>
                </div>
                <div className="card-footer">
                  <span className="card-size">{formatFileSize(doc.file_size)}</span>
                  <span className="card-date">{formatDate(doc.created_at)}</span>
                </div>
              </div>
              <button
                className="card-delete"
                onClick={(e) => handleDelete(doc, e)}
                title="Delete document"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && documents.length > 0 && viewMode === 'list' && (
        <DataTable
          data={documents}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          pagination={pagination}
          onPageChange={(page) => fetchDocuments(page)}
          emptyMessage="No documents yet. Upload your first document to get started."
          actions={[]}
          onAction={handleDelete}
        />
      )}

      {/* Pagination for Grid View */}
      {!loading && documents.length > 0 && viewMode === 'grid' && pagination && pagination.totalPages > 1 && (
        <div className="grid-pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchDocuments(pagination.page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchDocuments(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <NewItemModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
        title="Upload Document"
        fields={uploadFields}
        submitLabel="Upload"
        loading={uploading}
      />
    </div>
  );
}

export default Documents;
