import React from 'react';
import './Documentation.css';

export default function Documentation() {
  return (
    <div className="documentation-page">
      <aside className="documentation-sidebar">
        <nav>
          <ul>
            <li>Getting Started</li>
            <li>Features</li>
            <li>Usage Guide</li>
          </ul>
        </nav>
      </aside>

      <main className="documentation-content">
        <h2>Getting Started with PDFGenius</h2>
        <p>Welcome to PDFGenius documentation. This guide will help you get started with our PDF processing services.</p>

        <section className="doc-section">
          <h3>Features</h3>
          <ul>
            <li>Convert PDF documents to structured JSON</li>
            <li>AI-powered text extraction</li>
            <li>Support for multiple document types</li>
            <li>Real-time processing status</li>
          </ul>
        </section>

        <section className="doc-section">
          <h3>Usage Guide</h3>
          <ol>
            <li>Upload your PDF document using the file selector</li>
            <li>Click the "Convert" button to start processing</li>
            <li>Wait for the conversion to complete</li>
            <li>Download your JSON result</li>
          </ol>
        </section>

        <section className="doc-section">
          <h3>Supported Document Types</h3>
          <ul>
            <li>Business documents</li>
            <li>Legal contracts</li>
            <li>Financial statements</li>
            <li>General text documents</li>
          </ul>
        </section>

        <section className="doc-section">
          <h3>Best Practices</h3>
          <ul>
            <li>Use clear, legible PDFs for best results</li>
            <li>Ensure documents are not password protected</li>
            <li>Keep files under the maximum size limit</li>
            <li>Allow processing to complete before downloading</li>
          </ul>
        </section>
      </main>

      <aside className="documentation-toc">
        <h4>On this page</h4>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#usage-guide">Usage Guide</a></li>
          <li><a href="#supported-documents">Supported Documents</a></li>
          <li><a href="#best-practices">Best Practices</a></li>
        </ul>
      </aside>
    </div>
  );
}
