import React from 'react';
import PDFConverter from '../../components/PDFConverter';
import './Services.css';

export default function Services() {
  return (
    <div className="services-page">
      <div className="content-wrapper">
        <section className="services-hero">
          
          <section className="services-hero">
            <div className="hero-content">
              <h1>Advanced PDF Processing</h1>
              <p>Leveraging Generative AI to solve complex document processing challenges</p>
            </div>
          </section>
        </section>

        
        <section className="pdf-to-json">
          <div className="section-header">
            <h2>PDF to JSON Conversion</h2>
            <p>Our Generative AI technology handles the most challenging aspects of PDF extraction</p>
          </div>
          
          <div className="converter-wrapper">
            <PDFConverter />
          </div>

          <div className="benefits-container">
            <div className="benefits-grid">
              <div className="benefit-card">
                <h3>Technical Excellence</h3>
                <div className="benefit-list">
                  <div className="benefit-item">
                    <span className="benefit-icon">🔍</span>
                    <p>Complex layout processing</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">📑</span>
                    <p>Multi-column text extraction</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">📊</span>
                    <p>Nested table handling</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">📄</span>
                    <p>Poor quality scan processing</p>
                  </div>
                </div>
              </div>
              
              <div className="benefit-card">
                <h3>Business Benefits</h3>
                <div className="benefit-list">
                  <div className="benefit-item">
                    <span className="benefit-icon">⚡</span>
                    <p>30-40% time savings</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">💰</span>
                    <p>Reduced manual entry costs</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✅</span>
                    <p>Improved data accuracy</p>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🔒</span>
                    <p>Better compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        

        
      </div>
    </div>
  );
}
