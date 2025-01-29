
import React from 'react';
import './FeatureSection.css';

export default function FeatureSection() {
  const features = [
    {
      icon: 'fas fa-file-code',
      title: 'PDF to JSON',
      description: 'Convert any PDF document into structured JSON data with high accuracy'
    },
    {
      icon: 'fas fa-brain',
      title: 'AI-Powered',
      description: 'Advanced AI models for intelligent document processing and understanding'
    },
    {
      icon: 'fas fa-industry',
      title: 'Domain-Specific',
      description: 'Specialized processing for different industries and document types'
    },
    {
      icon: 'fas fa-bolt',
      title: 'Fast Processing',
      description: 'Process documents in seconds with our optimized pipeline'
    },
    {
      icon: 'fas fa-code',
      title: 'API Access',
      description: 'Integrate our services directly into your applications'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Secure',
      description: 'Enterprise-grade security for all your document processing needs'
    }
  ];

  return (
    <section className="feature-section">
      <div className="feature-header">
        <h2>Why Choose PDFGenius?</h2>
        <p>Powerful features to handle all your document processing needs</p>
      </div>

      <div className="feature-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">
              <i className={feature.icon}></i>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

