import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmContext';
import { DetailSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast/ToastContext';
import './index.css';

function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/documents/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch document');
      setDocument(data.document);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  const fetchPdfUrl = useCallback(async () => {
    setPdfError(null);
    try {
      const response = await authFetch(`/api/documents/${id}/download`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'PDF download failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPdfUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return objectUrl;
      });
    } catch (fetchError) {
      setPdfError(fetchError.message);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchDocument();
    fetchPdfUrl();
  }, [fetchDocument, fetchPdfUrl]);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Document',
      message: 'Delete this retained PDF from durable storage and its database record?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await authFetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }
      toast.success('Document deleted');
      navigate('/documents');
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return <div className="document-detail-page"><DetailSkeleton /></div>;
  }

  if (error || !document) {
    return (
      <div className="document-detail-page">
        <div className="error-container">
          <h2>{document ? 'Error' : 'Document Not Found'}</h2>
          {error && <p>{error}</p>}
          <button onClick={() => navigate('/documents')}>Back to Documents</button>
        </div>
      </div>
    );
  }

  const provenance = document.metadata?.provenance || {};

  return (
    <div className="document-detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/documents')}>&larr; Back</button>
        <div className="header-content">
          <h1>{document.original_name}</h1>
          <span className="status-badge status-pending">retained</span>
        </div>
        <div className="header-actions">
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="info-label">File Size</span>
          <span className="info-value">{formatFileSize(document.file_size)}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Type</span>
          <span className="info-value">PDF</span>
        </div>
        <div className="info-card">
          <span className="info-label">Malware Scan</span>
          <span className="info-value">{provenance.malwareScan?.result || 'not recorded'}</span>
        </div>
        <div className="info-card">
          <span className="info-label">Uploaded</span>
          <span className="info-value">{new Date(document.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="tab-content">
        <div className="pdf-viewer-container">
          {pdfUrl ? (
            <iframe src={pdfUrl} title={document.original_name} className="pdf-viewer" />
          ) : (
            <div className="pdf-loading">
              {pdfError ? <p>{pdfError}</p> : <><div className="spinner" /><p>Loading PDF...</p></>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentDetail;
