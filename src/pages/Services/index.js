import React from 'react';
import './Services.css';

export default function Services() {
  return (
    <div className="services-page">
      <div className="content-wrapper">
        <section className="services-hero">
          <div className="hero-content">
            <h1>Prototype capabilities are quarantined</h1>
            <p>
              AI, OCR, conversion, extraction, comparison, and generated demo
              features are not supported services and are intentionally unavailable.
            </p>
          </div>
        </section>
        <section className="pdf-to-json">
          <div className="section-header">
            <h2>Evaluation boundary</h2>
            <p>
              Only authenticated PDF retention may be evaluated with synthetic data
              in an isolated local environment. See the repository README and
              PROJECT_STATUS.json before use.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
