// Documentation/index.js
import React from 'react';
import './Documentation.css';

export default function Documentation() {
  return (
    <div className="documentation-page">
      <aside className="doc-sidebar">
        <nav className="doc-nav">
          <ul>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#usage-guide">Usage Guide</a></li>
            <li><a href="#supported-types">Supported Document Types</a></li>
            <li><a href="#best-practices">Best Practices</a></li>
          </ul>
        </nav>
      </aside>

      <main className="doc-content">
        <section id="getting-started" className="doc-section">
          <h1>Getting Started with PDFGenius</h1>
          <p>Welcome to PDFGenius documentation. This guide will help you get started with our PDF processing services.</p>
        </section>

        <section id="features" className="doc-section">
          <h2>Features</h2>
          <div className="feature-grid">
            <div className="feature-item">
              <span className="feature-icon">🔄</span>
              <h3>Convert PDF to JSON</h3>
              <p>Transform PDF documents into structured JSON data</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <h3>AI-Powered Extraction</h3>
              <p>Advanced text extraction capabilities</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <h3>Multiple Document Types</h3>
              <p>Support for various document formats</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3>Real-time Processing</h3>
              <p>Live status updates during conversion</p>
            </div>
          </div>
        </section>

        <section id="usage-guide" className="doc-section">
          <h2>Usage Guide</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <p>Upload your PDF document using the file selector</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <p>Click the "Convert" button to start processing</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <p>Wait for the conversion to complete</p>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <p>Download your JSON result</p>
            </div>
          </div>
        </section>

        <section id="best-practices" className="doc-section">
          <h2>Best Practices</h2>
          <div className="best-practices-grid">
            <div className="practice-item">
              <span className="practice-icon">✨</span>
              <p>Use clear, legible PDFs for best results</p>
            </div>
            <div className="practice-item">
              <span className="practice-icon">🔒</span>
              <p>Ensure documents are not password protected</p>
            </div>
            <div className="practice-item">
              <span className="practice-icon">📏</span>
              <p>Keep files under the maximum size limit</p>
            </div>
            <div className="practice-item">
              <span className="practice-icon">⏳</span>
              <p>Allow processing to complete before downloading</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
