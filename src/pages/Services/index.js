import React from 'react';
import PDFConverter from '../../components/PDFConverter';

export default function Services() {
  return (
    <div className="services-page">
      <section className="services-hero">
        <h1>Our Services</h1>
        <p>Powerful PDF Processing Solutions</p>
      </section>

      <section className="service-options">
        <div className="service-card">
          <h2>PDF to JSON</h2>
          <p>Convert any PDF document into structured JSON data</p>
          <PDFConverter />
        </div>

        <div className="service-card">
          <h2>Domain-Specific Processing</h2>
          <p>Coming Soon: Specialized document processing for:</p>
          <ul>
            <li>Medical Records</li>
            <li>Legal Documents</li>
            <li>Financial Reports</li>
            <li>Technical Documentation</li>
          </ul>
        </div>

        <div className="service-card">
          <h2>Custom Solutions</h2>
          <p>Need a specific document processing solution?</p>
          <button className="contact-sales-btn">Contact Sales</button>
        </div>
      </section>
    </div>
  );
}

