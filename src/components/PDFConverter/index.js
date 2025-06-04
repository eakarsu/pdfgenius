// src/components/PDFConverter/index.js
import React, { useState } from 'react';
import axios from 'axios';
import './PDFConverter.css';

// Get the API URL from environment variables or use a default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const document_extensions = ['.pdf', '.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm', 
  '.xls', '.xlsx', '.xlsm', '.xlt', '.xltx', '.xltm', '.xlsb',
  '.ppt', '.pptx', '.pptm', '.pot', '.potx', '.potm', 
  '.ppsx', '.ppsm', '.sldx', '.sldm'];

export default function DocumentConverter() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [model, setModel] = useState('openai/gpt-4.1');

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const isSupported = document_extensions.some(ext => fileName.endsWith(ext));
      if (isSupported) {
        setFile(selectedFile);
        setResult(null);
        setError(null);
      } else {
        setError("Unsupported file type. Please upload a supported document format.");
        event.target.value = null;
        setFile(null);
      }
    }
  };

  // NEW: Use server API instead of local processing
  const processFile = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('customPrompt', customPrompt || '');
      formData.append('model', model);

      const apiKey = process.env.REACT_APP_OPENROUTER_KEY;
      
      const response = await axios.post(`${API_URL}/api/process-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-Key': apiKey // Send API key in header
        },
        timeout: 300000 // 5 minute timeout
      });

      if (response.data.success) {
        setResult(response.data.results);
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response) {
        setError(error.response.data.error || 'Server error occurred');
      } else if (error.request) {
        setError('Network error - please check your connection');
      } else {
        setError(error.message || 'An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="converter-container">
      <div className="file-upload-area">
        <input 
          type="file" 
          id="fileInput" 
          accept={document_extensions.join(',')}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <label htmlFor="fileInput" className="browse-button">
          Browse...
        </label>
        <div className="file-status">
          {file ? file.name : 'No file selected'}
        </div>
      </div>

      {/* NEW: Custom prompt input */}
      <div className="prompt-section">
        <label htmlFor="customPrompt">Custom Prompt (optional):</label>
        <textarea
          id="customPrompt"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Enter custom instructions for AI processing..."
          rows="3"
        />
      </div>

      {/* NEW: Model selection */}
      <div className="model-section">
        <label htmlFor="modelSelect">AI Model:</label>
        <select 
          id="modelSelect" 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="openai/gpt-4.1">GPT-4.1</option>
          <option value="google/gemini-2.5-pro-preview">Gemini 2.5 Pro</option>
          <option value="amazon/nova-pro-v1">Amazon Nova Pro</option>
          <option value="meta-llama/llama-4-maverick:free">Llama 4 Maverick</option>
        </select>
      </div>
  
      <button 
        className="convert-button"
        disabled={!file || loading}
        onClick={processFile}
      >
        {loading ? 'Converting...' : 'Convert to JSON'}
      </button>
      
      {error && <div className="error-message">{error}</div>}
  
      {result && (
        <div className="results-section">
          {result.map((page, index) => {
            let pageData;
            try {
              pageData = typeof page.data === 'string' ? JSON.parse(page.data) : page.data;
            } catch (e) {
              pageData = page.data;
            }
            return (
              <div key={index} className="page-content">
                <h3>Page {page.page}</h3>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pageData || {}).map(([key, value], i) => (
                        <tr key={i}>
                          <td className="field-name">{key}</td>
                          <td className="field-value">
                            {typeof value === 'object' 
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

