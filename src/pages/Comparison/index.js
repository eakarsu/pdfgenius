import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmContext';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';
import SearchBar from '../../components/SearchBar';
import { exportToCSV } from '../../utils/export.util';
import { TableSkeleton } from '../../components/Skeleton';
import './index.css';

function Comparison() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [documentA, setDocumentA] = useState('');
  const [documentB, setDocumentB] = useState('');
  const [comparisonType, setComparisonType] = useState('text');
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents?status=completed&limit=100');
      const data = await response.json();
      if (response.ok) setDocuments(data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [authFetch]);

  const fetchComparisons = useCallback(async () => {
    setLoading(true);
    try {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const endpoint = searchQuery ? `/api/search/comparisons${params}` : '/api/compare';
      const response = await authFetch(endpoint);
      const data = await response.json();
      if (response.ok) setComparisons(data.comparisons);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchQuery]);

  useEffect(() => {
    fetchDocuments();
    fetchComparisons();
  }, [fetchDocuments, fetchComparisons]);

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!documentA || !documentB) {
      toast.warning('Please select two documents to compare');
      return;
    }
    if (documentA === documentB) {
      toast.warning('Please select two different documents');
      return;
    }

    setComparing(true);
    setError(null);

    try {
      const response = await authFetch('/api/compare', {
        method: 'POST',
        body: JSON.stringify({ documentAId: documentA, documentBId: documentB, comparisonType })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Comparison completed');
        setSelectedComparison(data.comparison);
        await fetchComparisons();
        setDocumentA('');
        setDocumentB('');
      } else {
        throw new Error(data.message || 'Comparison failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setComparing(false);
    }
  };

  const handleDelete = async (comparison) => {
    const confirmed = await confirm({
      title: 'Delete Comparison',
      message: 'Are you sure you want to delete this comparison?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/compare/${comparison.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Comparison deleted');
        await fetchComparisons();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async (ids) => {
    const confirmed = await confirm({
      title: 'Delete Comparisons',
      message: `Delete ${ids.length} comparison(s)?`,
      confirmLabel: 'Delete All',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await authFetch('/api/compare/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      if (response.ok) {
        toast.success(`${ids.length} comparison(s) deleted`);
        setSelectedIds([]);
        await fetchComparisons();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(comparisons, [
      { key: 'documentA', label: 'Document A', exportRender: (v) => v?.original_name || '-' },
      { key: 'documentB', label: 'Document B', exportRender: (v) => v?.original_name || '-' },
      { key: 'comparison_type', label: 'Type' },
      { key: 'similarity_score', label: 'Similarity' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Date' }
    ], 'comparisons.csv');
    toast.success('CSV exported');
  };

  const getSimilarityColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const columns = [
    { key: 'documentA', label: 'Document A', render: (v) => v?.original_name || '-' },
    { key: 'documentB', label: 'Document B', render: (v) => v?.original_name || '-' },
    { key: 'comparison_type', label: 'Type', width: '100px' },
    {
      key: 'similarity_score', label: 'Similarity', width: '120px',
      render: (v) => v ? (
        <div className="similarity-bar">
          <div className="similarity-fill" style={{ width: `${v}%`, backgroundColor: getSimilarityColor(v) }} />
          <span>{v}%</span>
        </div>
      ) : '-'
    },
    { key: 'status', label: 'Status', type: 'status', width: '100px' },
    { key: 'created_at', label: 'Date', type: 'datetime', width: '150px' }
  ];

  return (
    <div className="comparison-page">
      <div className="page-header">
        <div>
          <h1>Document Comparison</h1>
          <p className="page-description">Compare documents to find similarities and differences</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV} disabled={comparisons.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="comparison-form-card">
        <h3>New Comparison</h3>
        <form onSubmit={handleCompare} className="comparison-form">
          <div className="form-row">
            <div className="form-group">
              <label>Document A</label>
              <select value={documentA} onChange={(e) => setDocumentA(e.target.value)} disabled={comparing}>
                <option value="">Select document...</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.original_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Document B</label>
              <select value={documentB} onChange={(e) => setDocumentB(e.target.value)} disabled={comparing}>
                <option value="">Select document...</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.original_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Comparison Type</label>
              <select value={comparisonType} onChange={(e) => setComparisonType(e.target.value)} disabled={comparing}>
                <option value="text">Text Comparison</option>
                <option value="structural">Structural</option>
                <option value="semantic">Semantic</option>
                <option value="full">Full Analysis</option>
              </select>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={comparing}>
            {comparing ? 'Comparing...' : 'Compare Documents'}
          </button>
        </form>
      </div>

      <div className="history-section">
        <h3>Comparison History</h3>
        <SearchBar onSearch={(q) => setSearchQuery(q)} placeholder="Search comparisons..." />
        <DataTable
          data={comparisons}
          columns={columns}
          loading={loading}
          onRowClick={setSelectedComparison}
          onAction={handleDelete}
          emptyMessage="No comparisons yet. Create your first comparison above."
          selectable={true}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          bulkActions={[
            { label: 'Delete Selected', variant: 'danger', onClick: handleBulkDelete }
          ]}
          searchable={false}
        />
      </div>

      <DetailModal
        isOpen={!!selectedComparison}
        onClose={() => setSelectedComparison(null)}
        title="Comparison Results"
        size="large"
        actions={[
          { label: 'Delete', variant: 'danger', onClick: () => { handleDelete(selectedComparison); setSelectedComparison(null); } },
          { label: 'Close', onClick: () => setSelectedComparison(null) }
        ]}
      >
        {selectedComparison && (
          <div className="comparison-results">
            <div className="result-header">
              <div className="doc-info">
                <h4>{selectedComparison.documentA?.original_name || 'Document A'}</h4>
                <span>vs</span>
                <h4>{selectedComparison.documentB?.original_name || 'Document B'}</h4>
              </div>
              <div className="similarity-score">
                <span className="score-value">{selectedComparison.similarity_score}%</span>
                <span className="score-label">Similarity</span>
              </div>
            </div>
            <div className="result-summary">
              <p><strong>Type:</strong> {selectedComparison.comparison_type}</p>
              <p><strong>Differences Found:</strong> {selectedComparison.differences_count}</p>
              <p><strong>Date:</strong> {new Date(selectedComparison.created_at).toLocaleString()}</p>
            </div>
            {selectedComparison.result && (
              <div className="diff-preview">
                <h4>Analysis Result</h4>
                <pre>{JSON.stringify(selectedComparison.result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default Comparison;
