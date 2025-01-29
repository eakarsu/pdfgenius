import React from 'react';

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About Us</h1>
        <p>Transforming Document Processing with AI</p>
      </section>

      <section className="mission-section">
        <h2>Our Mission</h2>
        <p>We're dedicated to making document processing effortless through advanced AI technology.</p>
      </section>

      <section className="technology-section">
        <h2>Our Technology</h2>
        <div className="tech-grid">
          <div className="tech-card">
            <h3>AI-Powered Processing</h3>
            <p>Using latest generative AI models for accurate document understanding</p>
          </div>
          <div className="tech-card">
            <h3>Advanced OCR</h3>
            <p>High-precision text and layout recognition</p>
          </div>
          <div className="tech-card">
            <h3>Custom Models</h3>
            <p>Domain-specific models trained for specialized documents</p>
          </div>
        </div>
      </section>
    </div>
  );
}

