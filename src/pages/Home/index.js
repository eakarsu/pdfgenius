import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero-section">
       
        <div className="hero-content">
          <h1>Transform Complex PDFs with Generative AI</h1>
          <p>Tackle challenging PDF layouts, multi-column text, and mixed content with 99% accuracy using state-of-the-art AI technology</p>
          <Link to="/services" className="cta-button">Try It Now</Link>
        </div>


      </section>

      <section className="features-section">
      <h2>Why Choose Our AI Solution</h2>
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Enhanced Accuracy</h3>
          <p>Up to 99% accuracy in extracting data from complex layouts, poor quality scans, and mixed content types</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>90% Faster Processing</h3>
          <p>Process multiple documents simultaneously while maintaining perfect accuracy</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <h3>Cost Reduction</h3>
          <p>Reduce manual data entry costs and free up staff for higher-value tasks</p>
        </div>
      </div>
    </section>

    <section className="industries-section">
      <h2>Technical Challenges We Solve</h2>
      <div className="industry-grid">
        <div className="industry-card">
          <h3>Layout Complexity</h3>
          <p>Handle inconsistent layouts, multi-column content, and nested tables with precision</p>
        </div>
        <div className="industry-card">
          <h3>Data Quality</h3>
          <p>Process poor quality scans and mixed content types while maintaining accuracy</p>
        </div>
        <div className="industry-card">
          <h3>Compliance & Quality</h3>
          <p>Ensure regulatory compliance with reliable data extraction and validation</p>
        </div>
      </div>
    </section>





    </div>
  );
}
