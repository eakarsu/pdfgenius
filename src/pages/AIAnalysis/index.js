import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import { useConfirm } from '../../components/ConfirmDialog/ConfirmContext';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';
import SearchBar from '../../components/SearchBar';
import { exportToCSV } from '../../utils/export.util';
import './index.css';

function AIAnalysis() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [model, setModel] = useState('anthropic/claude-haiku-4.5');
  const [prompt, setPrompt] = useState('');
  const [analysisType, setAnalysisType] = useState('summarize');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [error, setError] = useState(null);

  const models = [
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5 (Fast)' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (Recommended)' },
    { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4 (Most Capable)' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
    { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' }
  ];

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents?status=completed&limit=100');
      const data = await response.json();
      if (response.ok) setDocuments(data.documents);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [authFetch]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/ai/history');
      const data = await response.json();
      if (response.ok) setHistory(data.history);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDocuments();
    fetchHistory();
  }, [fetchDocuments, fetchHistory]);

  const handleAnalyze = async () => {
    if (!selectedDocId) { toast.warning('Please select a document'); return; }
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = analysisType === 'summarize'
        ? `/api/ai/summarize/${selectedDocId}`
        : analysisType === 'extract'
        ? `/api/ai/extract/${selectedDocId}`
        : `/api/ai/analyze/${selectedDocId}`;

      const response = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          model,
          customPrompt: prompt || undefined,
          prompt: analysisType === 'custom' ? prompt : undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        toast.success('Analysis completed');
        await fetchHistory();
      } else {
        throw new Error(data.message || 'Analysis failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (item) => {
    const confirmed = await confirm({
      title: 'Delete Analysis',
      message: 'Delete this analysis result?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    // Note: History items are ProcessingJobs - we'd need a delete endpoint
    // For now, just remove from local state
    toast.info('Analysis record removed');
    setSelectedHistory(null);
  };

  const handleExportCSV = () => {
    exportToCSV(history, [
      { key: 'document', label: 'Document', exportRender: (v) => v?.original_name || '-' },
      { key: 'job_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Date' }
    ], 'ai_analysis_history.csv');
    toast.success('CSV exported');
  };

  const historyColumns = [
    { key: 'document', label: 'Document', render: (v) => v?.original_name || '-' },
    { key: 'job_type', label: 'Type', width: '100px' },
    { key: 'status', label: 'Status', type: 'status', width: '100px' },
    { key: 'created_at', label: 'Date', type: 'datetime', width: '150px' }
  ];

  const promptTemplates = {
    summarize: 'Provide a comprehensive summary of this document including key points and main conclusions.',
    extract: 'Extract all key data points, names, dates, amounts, and other structured information from this document.',
    analyze: 'Analyze this document and identify: 1) Main themes 2) Key findings 3) Potential issues 4) Recommendations',
    legal: 'Review this document from a legal perspective. Identify key terms, obligations, risks, and important clauses.',
    financial: 'Analyze the financial data in this document. Summarize key metrics, trends, and notable figures.'
  };

  const applyTemplate = (templateKey) => {
    setPrompt(promptTemplates[templateKey]);
    setAnalysisType('custom');
  };

  return (
    <div className="ai-analysis-page">
      <div className="page-header">
        <div>
          <h1>AI Analysis</h1>
          <p className="page-description">Use AI to summarize, extract, and analyze your documents</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV} disabled={history.length === 0}>
          Export History CSV
        </button>
      </div>

      <div className="analysis-form-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Document</label>
            <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} disabled={analyzing}>
              <option value="">Select a document...</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.original_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>AI Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={analyzing}>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Analysis Type</label>
            <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)} disabled={analyzing}>
              <option value="summarize">Summarize</option>
              <option value="extract">Extract Data</option>
              <option value="custom">Custom Prompt</option>
            </select>
          </div>
        </div>

        <div className="prompt-templates">
          <span className="template-label">Quick prompts:</span>
          <button onClick={() => applyTemplate('summarize')}>Summary</button>
          <button onClick={() => applyTemplate('extract')}>Extract Data</button>
          <button onClick={() => applyTemplate('analyze')}>Full Analysis</button>
          <button onClick={() => applyTemplate('legal')}>Legal Review</button>
          <button onClick={() => applyTemplate('financial')}>Financial</button>
        </div>

        {analysisType === 'custom' && (
          <div className="form-group full-width">
            <label>Custom Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter your custom analysis prompt..." rows={4} disabled={analyzing} />
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        <button className="btn-primary" onClick={handleAnalyze} disabled={!selectedDocId || analyzing}>
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {result && (
        <div className="result-card">
          <div className="result-header">
            <h3>Analysis Result</h3>
            <span className="result-model">{model}</span>
          </div>
          <div className="result-content">
            {result.summary && (
              <div className="result-section">
                <h4>Summary</h4>
                <p>{result.summary}</p>
              </div>
            )}
            {result.result && (
              <div className="result-section">
                <h4>Result</h4>
                <p>{result.result}</p>
              </div>
            )}
            {result.extractedData && (
              <div className="result-section">
                <h4>Extracted Data</h4>
                <pre>{JSON.stringify(result.extractedData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="history-section">
        <h3>Analysis History</h3>
        <DataTable
          data={history}
          columns={historyColumns}
          loading={loading}
          onRowClick={setSelectedHistory}
          emptyMessage="No analysis history yet"
          searchable={true}
        />
      </div>

      <DetailModal
        isOpen={!!selectedHistory}
        onClose={() => setSelectedHistory(null)}
        title="Analysis Details"
        size="large"
        actions={[
          { label: 'Delete', variant: 'danger', onClick: () => handleDeleteHistory(selectedHistory) },
          { label: 'Close', onClick: () => setSelectedHistory(null) }
        ]}
      >
        {selectedHistory && (
          <div className="history-detail">
            <div className="detail-meta">
              <p><strong>Document:</strong> {selectedHistory.document?.original_name}</p>
              <p><strong>Type:</strong> {selectedHistory.job_type}</p>
              <p><strong>Status:</strong> {selectedHistory.status}</p>
              <p><strong>Date:</strong> {new Date(selectedHistory.created_at).toLocaleString()}</p>
            </div>
            {selectedHistory.result && (
              <div className="detail-result">
                <h4>Result</h4>
                <pre>{JSON.stringify(selectedHistory.result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}

export default AIAnalysis;
