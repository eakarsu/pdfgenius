import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Local PDF retention prototype</h1>
          <h2 className="hero-subtitle">Unsupported, synthetic-data-only evaluation</h2>
          <p>
            This repository is quarantined. It is not a PDF processing product,
            has no approved deployment, and must not receive real documents or credentials.
          </p>
          <div className="hero-cta">
            <Link to="/login" className="cta-button primary">Local sign in</Link>
            <Link to="/documents" className="cta-button secondary">Open retained documents</Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Retained boundary</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">&#128274;</div>
            <h3>Owner-scoped access</h3>
            <p>Authenticated users can only list, retrieve, and delete their own retained records.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">&#128196;</div>
            <h3>Strict PDF gate</h3>
            <p>Uploads require PDF content checks, active-content rejection, and a clean malware scan.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">&#9940;</div>
            <h3>Processing disabled</h3>
            <p>AI, OCR, conversion, extraction, bulk mutation, and deployment are outside this boundary.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
