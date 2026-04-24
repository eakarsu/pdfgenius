import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>AI PDF Extraction: Transform Complex Documents Instantly</h1>
          <h2 className="hero-subtitle">Extract Data from PDFs with 99% Accuracy Using Vision AI</h2>
          <p>
            Process multi-column layouts, tables, and scanned documents in seconds.
            Get structured JSON data from any PDF format. Try 10 documents free.
          </p>
          <div className="hero-cta">
            <Link to="/services" className="cta-button primary">Start Free Trial</Link>
            <Link to="/pricing" className="cta-button secondary">View Pricing</Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose Our AI Solution</h2>
        <div className="features-grid">
          <div className="feature-card clickable-card" onClick={() => navigate('/documents')}>
            <div className="feature-icon">&#127919;</div>
            <h3>Document Management</h3>
            <p>Upload, organize, and manage your PDF documents with AI-powered processing and extraction</p>
          </div>
          <div className="feature-card clickable-card" onClick={() => navigate('/table-extraction')}>
            <div className="feature-icon">&#9889;</div>
            <h3>Table Extraction</h3>
            <p>Extract structured tables from PDFs with high accuracy. Export to CSV or JSON format</p>
          </div>
          <div className="feature-card clickable-card" onClick={() => navigate('/form-extraction')}>
            <div className="feature-icon">&#128203;</div>
            <h3>Form Extraction</h3>
            <p>Automatically detect and extract form fields, values, and signatures from documents</p>
          </div>
          <div className="feature-card clickable-card" onClick={() => navigate('/comparison')}>
            <div className="feature-icon">&#128200;</div>
            <h3>Document Comparison</h3>
            <p>Compare two documents side-by-side to find similarities, differences, and changes</p>
          </div>
          <div className="feature-card clickable-card" onClick={() => navigate('/ai-analysis')}>
            <div className="feature-icon">&#129302;</div>
            <h3>AI Analysis</h3>
            <p>Use AI models to summarize, analyze, and extract insights from your documents</p>
          </div>
          <div className="feature-card clickable-card" onClick={() => navigate('/pricing')}>
            <div className="feature-icon">&#128176;</div>
            <h3>Flexible Pricing</h3>
            <p>Choose a plan that fits your needs. Start free and scale as your business grows</p>
          </div>
        </div>
      </section>

      <section className="industries-section">
        <h2>Technical Challenges We Solve</h2>
        <div className="industry-grid">
          <div className="industry-card clickable-card" onClick={() => navigate('/services')}>
            <h3>Layout Complexity</h3>
            <p>Handle inconsistent layouts, multi-column content, and nested tables with precision</p>
          </div>
          <div className="industry-card clickable-card" onClick={() => navigate('/services')}>
            <h3>Data Quality</h3>
            <p>Process poor quality scans and mixed content types while maintaining accuracy</p>
          </div>
          <div className="industry-card clickable-card" onClick={() => navigate('/services')}>
            <h3>Compliance & Quality</h3>
            <p>Ensure regulatory compliance with reliable data extraction and validation</p>
          </div>
        </div>
      </section>
    </div>
  );
}
