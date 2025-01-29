import React from 'react';
import PDFConverter from '../../components/PDFConverter';
import './Services.css';

export default function Services() {
  return (
    <div className="services-page">
      <section className="services-hero">
        <h1>Our Services</h1>
        <p>Powerful PDF Processing Solutions</p>
      </section>

      <section className="pdf-to-json">
        <h2>PDF to JSON</h2>
        <p>Convert any PDF document into structured JSON data</p>
        
        <div className="converter-container">
          <PDFConverter />
        </div>
      </section>

      <section className="domain-specific">
        <h2>Domain-Specific Processing</h2>
        <p>Coming Soon: Specialized document processing for:</p>
        <ul>
          <li>Medical Records</li>
          <li>Legal Documents</li>
          <li>Financial Statements</li>
          <li>Business Documents</li>
        </ul>
      </section>
    </div>
  );
}
