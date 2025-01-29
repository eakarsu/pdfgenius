import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../../components/HeroSection';
import FeatureSection from '../../components/FeatureSection';
import TestimonialSection from '../../components/TestimonialSection';

export default function Home() {
  return (
    <div className="home">
      <HeroSection />
      
      <section className="features-overview">
        <h2>Transform Your Documents with AI</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>PDF to JSON Conversion</h3>
            <p>Convert any PDF document into structured JSON data using advanced AI</p>
          </div>
          <div className="feature-card">
            <h3>Domain-Specific Processing</h3>
            <p>Specialized document processing for industries like healthcare, legal, and finance</p>
          </div>
          <div className="feature-card">
            <h3>Batch Processing</h3>
            <p>Process multiple documents simultaneously with high accuracy</p>
          </div>
        </div>
      </section>

      <TestimonialSection />
      
      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Transform your PDF documents into actionable data today</p>
        <Link to="/services" className="cta-button">Try It Now</Link>
      </section>
    </div>
  );
}

