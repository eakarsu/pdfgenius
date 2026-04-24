import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmContext';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import FilterControls from '../../components/FilterControls';
import NewItemModal from '../../components/NewItemModal';
import { StatCardSkeleton, CardSkeleton } from '../../components/Skeleton';
import { exportToCSV } from '../../utils/export.util';
import { exportToPDF } from '../../utils/pdfExport.util';
import './index.css';

function Documents() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  // Fetch documents with search/filter
  const fetchDocuments = useCallback(async (page = 1, search = searchQuery, filterParams = filters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        _t: Date.now()
      });

      if (search) params.append('q', search);
      if (filterParams.status) params.append('status', filterParams.status);
      if (filterParams.dateFrom) params.append('dateFrom', filterParams.dateFrom);
      if (filterParams.dateTo) params.append('dateTo', filterParams.dateTo);

      const endpoint = search || filterParams.status ? '/api/search/documents' : '/api/documents';
      const response = await authFetch(`${endpoint}?${params}`);
      const data = await response.json();

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
  }, [authFetch, searchQuery, filters]);

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

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchDocuments(1, query, filters);
  };

  // Handle filter apply
  const handleFilterApply = (filterValues) => {
    setFilters(filterValues);
    fetchDocuments(1, searchQuery, filterValues);
  };

  // Handle filter reset
  const handleFilterReset = () => {
    setFilters({});
    fetchDocuments(1, searchQuery, {});
  };

  // Handle document upload
  const handleUpload = async (formData) => {
    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be logged in to upload documents');
      if (!formData.file) throw new Error('Please select a file to upload');

      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('processNow', formData.processNow || false);
      if (formData.model) uploadData.append('model', formData.model);

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      toast.success('Document uploaded successfully');
      await fetchDocuments();
      await fetchStats();
      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message);
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

    const confirmed = await confirm({
      title: 'Delete Document',
      message: `Are you sure you want to delete "${doc.original_name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/documents/${doc.id}`, { method: 'DELETE' });

      if (response.ok) {
        toast.success('Document deleted');
        await fetchDocuments();
        await fetchStats();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids) => {
    const confirmed = await confirm({
      title: 'Delete Documents',
      message: `Are you sure you want to delete ${ids.length} document(s)? This action cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const response = await authFetch('/api/documents/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${data.deletedCount} document(s) deleted`);
        setSelectedIds([]);
        await fetchDocuments();
        await fetchStats();
      } else {
        throw new Error(data.message || 'Bulk delete failed');
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    exportToCSV(documents, exportColumns, 'documents.csv');
    toast.success('CSV exported');
  };

  const handleExportPDF = async () => {
    await exportToPDF(documents, exportColumns, 'Documents', 'documents.pdf');
    toast.success('PDF exported');
  };

  // Format helpers
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      pending: 'status-pending', processing: 'status-processing',
      completed: 'status-completed', failed: 'status-failed'
    };
    return statusClasses[status] || 'status-pending';
  };

  // Table columns
  const columns = [
    {
      key: 'original_name', label: 'Name',
      render: (value) => (
        <div className="doc-name">
          <span className="doc-icon">&#128196;</span>
          {value}
        </div>
      )
    },
    { key: 'status', label: 'Status', type: 'status', width: '120px' },
    { key: 'total_pages', label: 'Pages', type: 'number', width: '80px', render: (value) => value || '-' },
    { key: 'file_size', label: 'Size', type: 'size', width: '100px' },
    { key: 'created_at', label: 'Uploaded', type: 'datetime', width: '180px' }
  ];

  // Export columns (plain text)
  const exportColumns = [
    { key: 'original_name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'total_pages', label: 'Pages' },
    { key: 'file_size', label: 'Size', exportRender: (v) => formatFileSize(v) },
    { key: 'created_at', label: 'Uploaded', exportRender: (v) => formatDate(v) }
  ];

  // Filter config
  const filterConfig = [
    {
      name: 'status', label: 'Status', type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' }
      ]
    },
    { name: 'dateFrom', label: 'From Date', type: 'date' },
    { name: 'dateTo', label: 'To Date', type: 'date' }
  ];

  // Upload form fields
  const uploadFields = [
    { name: 'file', label: 'PDF Document', type: 'file', required: true, accept: '.pdf' },
    {
      name: 'model', label: 'AI Model', type: 'select',
      options: [
        { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (Recommended)' },
        { value: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4 (Fast)' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' }
      ]
    },
    {
      name: 'processNow', label: 'Process Immediately', type: 'checkbox',
      checkboxLabel: 'Start AI processing after upload', defaultValue: true
    }
  ];

  // Bulk actions
  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', onClick: handleBulkDelete }
  ];

  return (
    <div className="documents-page">
      <div className="page-header">
        <div>
          <h1>Documents</h1>
          <p className="page-description">Manage your uploaded documents</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExportCSV} disabled={documents.length === 0}>
            Export CSV
          </button>
          <button className="btn-secondary" onClick={handleExportPDF} disabled={documents.length === 0}>
            Export PDF
          </button>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            + Upload Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!stats && loading ? (
        <StatCardSkeleton count={4} />
      ) : stats && (
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

      {/* Search & Filter Controls */}
      <div className="search-filter-bar">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search documents..."
          value={searchQuery}
        />
        <button
          className="btn-filter"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </button>
      </div>

      {showFilters && (
        <FilterControls
          filters={filterConfig}
          onApply={handleFilterApply}
          onReset={handleFilterReset}
        />
      )}

      {/* View Toggle & Actions */}
      <div className="view-controls">
        <div className="view-toggle">
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid View">
            Grid
          </button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List View">
            List
          </button>
        </div>
        <button className="btn-refresh" onClick={() => fetchDocuments()}>Refresh</button>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => fetchDocuments()}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && viewMode === 'grid' && <CardSkeleton count={6} />}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">&#128196;</div>
          <h3>No documents yet</h3>
          <p>Upload your first PDF document to get started</p>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            + Upload Document
          </button>
        </div>
      )}

      {/* Grid View */}
      {!loading && documents.length > 0 && viewMode === 'grid' && (
        <div className="documents-grid">
          {documents.map(doc => (
            <div key={doc.id} className="document-card" onClick={() => handleRowClick(doc)}>
              <div className="card-preview">
                <div className="pdf-icon-large">
                  <span role="img" aria-label="PDF">&#128196;</span>
                </div>
              </div>
              <div className="card-info">
                <h4 className="card-title" title={doc.original_name}>{doc.original_name}</h4>
                <div className="card-meta">
                  <span className={`card-status ${getStatusClass(doc.status)}`}>{doc.status}</span>
                  <span className="card-pages">{doc.total_pages ? `${doc.total_pages} pages` : '-'}</span>
                </div>
                <div className="card-footer">
                  <span className="card-size">{formatFileSize(doc.file_size)}</span>
                  <span className="card-date">{formatDate(doc.created_at)}</span>
                </div>
              </div>
              <button className="card-delete" onClick={(e) => handleDelete(doc, e)} title="Delete document">
                &#128465;
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
          selectable={true}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          bulkActions={bulkActions}
          actions={[]}
          onAction={handleDelete}
        />
      )}

      {/* Pagination for Grid View */}
      {!loading && documents.length > 0 && viewMode === 'grid' && pagination && pagination.totalPages > 1 && (
        <div className="grid-pagination">
          <button disabled={pagination.page <= 1} onClick={() => fetchDocuments(pagination.page - 1)}>
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchDocuments(pagination.page + 1)}>
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
