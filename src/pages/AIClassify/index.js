import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import '../AIAnalysis/index.css';

const AVAILABLE_FRAMEWORKS = ['GDPR', 'HIPAA', 'PCI-DSS', 'SOC2', 'CCPA'];
const REDACTION_CATEGORIES = ['PII', 'PHI', 'PCI', 'Credentials', 'TradeSecrets'];
const TARGET_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Chinese (Simplified)', 'Korean', 'Arabic'];

function AIClassify() {
  const { authFetch } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [mode, setMode] = useState('classify');
  const [frameworks, setFrameworks] = useState(['GDPR', 'HIPAA']);
  const [redactionCats, setRedactionCats] = useState(['PII', 'PHI']);
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await authFetch('/api/documents?status=completed&limit=100');
      const data = await response.json();
      if (response.ok) setDocuments(data.documents || []);
    } catch (err) {
      // ignore
    }
  }, [authFetch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const toggleFramework = (fw) => {
    setFrameworks((prev) =>
      prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]
    );
  };

  const toggleRedactionCat = (c) => {
    setRedactionCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async () => {
    if (!selectedDocId) {
      toast.warning('Please select a document');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let endpoint;
      let body;
      switch (mode) {
        case 'classify':
          endpoint = `/api/ai/classify/${selectedDocId}`;
          body = JSON.stringify({});
          break;
        case 'compliance':
          endpoint = `/api/ai/compliance-check/${selectedDocId}`;
          body = JSON.stringify({ frameworks });
          break;
        case 'translate':
          endpoint = `/api/ai/translate/${selectedDocId}`;
          body = JSON.stringify({
            targetLanguage,
            ...(sourceLanguage ? { sourceLanguage } : {}),
          });
          break;
        case 'redaction':
          endpoint = `/api/ai/redaction-suggestions/${selectedDocId}`;
          body = JSON.stringify({ categories: redactionCats });
          break;
        default:
          endpoint = `/api/ai/classify/${selectedDocId}`;
          body = JSON.stringify({});
      }
      const response = await authFetch(endpoint, { method: 'POST', body });
      let data = {};
      try { data = await response.json(); } catch (_) { data = {}; }
      if (response.status === 503) {
        const msg = data.message || data.error || 'AI service not configured (set OPENROUTER_API_KEY)';
        throw new Error(msg);
      }
      if (response.ok) {
        setResult(data);
        const successLabel = {
          classify: 'Document classified',
          compliance: 'Compliance scan completed',
          translate: 'Translation completed',
          redaction: 'Redaction suggestions ready',
        }[mode] || 'Done';
        toast.success(successLabel);
      } else {
        throw new Error(data.message || data.error || 'Request failed');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-analysis-page">
      <div className="page-header">
        <div>
          <h1>Classify &amp; Compliance Check</h1>
          <p className="page-description">
            Categorize documents or scan against GDPR / HIPAA / PCI-DSS frameworks.
          </p>
        </div>
      </div>

      <div className="analysis-form-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Document</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.original_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={loading}>
              <option value="classify">Classify Document</option>
              <option value="compliance">Compliance Check</option>
              <option value="translate">Translate Document</option>
              <option value="redaction">Redaction Suggestions</option>
            </select>
          </div>
        </div>

        {mode === 'translate' && (
          <div className="form-group full-width" style={{ marginBottom: 16 }}>
            <label>Target Language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={loading}
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <label style={{ marginTop: 8 }}>Source Language (optional)</label>
            <input
              type="text"
              value={sourceLanguage}
              placeholder="auto-detect if blank"
              onChange={(e) => setSourceLanguage(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {mode === 'redaction' && (
          <div className="form-group full-width" style={{ marginBottom: 16 }}>
            <label>Categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REDACTION_CATEGORIES.map((c) => (
                <label
                  key={c}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: redactionCats.includes(c) ? '#fef3c7' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={redactionCats.includes(c)}
                    onChange={() => toggleRedactionCat(c)}
                    disabled={loading}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
        )}

        {mode === 'compliance' && (
          <div className="form-group full-width" style={{ marginBottom: 16 }}>
            <label>Frameworks</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVAILABLE_FRAMEWORKS.map((fw) => (
                <label
                  key={fw}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: frameworks.includes(fw) ? '#e0f2fe' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={frameworks.includes(fw)}
                    onChange={() => toggleFramework(fw)}
                    disabled={loading}
                  />
                  {fw}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={
            !selectedDocId ||
            loading ||
            (mode === 'compliance' && frameworks.length === 0) ||
            (mode === 'redaction' && redactionCats.length === 0) ||
            (mode === 'translate' && !targetLanguage)
          }
        >
          {loading
            ? 'Working...'
            : mode === 'classify'
            ? 'Classify Document'
            : mode === 'compliance'
            ? 'Run Compliance Check'
            : mode === 'translate'
            ? 'Translate Document'
            : 'Suggest Redactions'}
        </button>
      </div>

      {result && (
        <div className="result-card">
          <div className="result-header">
            <h3>Result</h3>
            <span className="result-model">
              {mode === 'classify'
                ? 'Classification'
                : mode === 'compliance'
                ? 'Compliance'
                : mode === 'translate'
                ? 'Translation'
                : 'Redaction Suggestions'}
            </span>
          </div>
          <div className="result-content">
            {result.category && (
              <div className="result-section">
                <h4>Category</h4>
                <p>{result.category}</p>
              </div>
            )}
            {result.confidence !== undefined && (
              <div className="result-section">
                <h4>Confidence</h4>
                <p>{typeof result.confidence === 'number' ? `${(result.confidence * 100).toFixed(0)}%` : String(result.confidence)}</p>
              </div>
            )}
            {Array.isArray(result.tags) && result.tags.length > 0 && (
              <div className="result-section">
                <h4>Tags</h4>
                <p>{result.tags.join(', ')}</p>
              </div>
            )}
            {Array.isArray(result.findings) && result.findings.length > 0 && (
              <div className="result-section">
                <h4>Findings</h4>
                <ul>
                  {result.findings.map((f, i) => (
                    <li key={i}>
                      <strong>{f.framework || f.framework_name || ''}</strong>
                      {f.severity ? ` [${f.severity}]` : ''} — {f.description || f.detail || JSON.stringify(f)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.translation && typeof result.translation === 'object' && result.translation.translation && (
              <div className="result-section">
                <h4>Translated Text ({result.translation.targetLanguage || result.targetLanguage})</h4>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{result.translation.translation}</pre>
              </div>
            )}
            {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
              <div className="result-section">
                <h4>Redaction Spans</h4>
                <ul>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>
                      <strong>{s.category}</strong>
                      {s.severity ? ` [${s.severity}]` : ''} — {s.snippet}
                      {s.replacement ? ` → ${s.replacement}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.summary && (
              <div className="result-section">
                <h4>Summary</h4>
                <p>{result.summary}</p>
              </div>
            )}
            <div className="result-section">
              <h4>Full Response</h4>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIClassify;
