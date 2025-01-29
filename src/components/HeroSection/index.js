import React from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

export default function HeroSection() {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <h1>Transform Your PDF Documents with AI</h1>
        <p>Convert PDFs to structured JSON data and generate domain-specific documents using advanced AI technology</p>
        <div className="hero-buttons">
          <Link to="/services" className="primary-btn">Get Started</Link>
          <Link to="/docs" className="secondary-btn">View Documentation</Link>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <h3>1M+</h3>
            <p>Documents Processed</p>
          </div>
          <div className="stat-item">
            <h3>99.9%</h3>
            <p>Accuracy Rate</p>
          </div>
          <div className="stat-item">
            <h3>50+</h3>
            <p>Document Types</p>
          </div>
        </div>
      </div>
      <div className="hero-image">
        <img src="/images/hero-illustration.svg" alt="PDF Processing Illustration" />
      </div>
    </div>
  );
}
