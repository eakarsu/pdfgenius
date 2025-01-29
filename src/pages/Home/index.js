import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../../components/HeroSection';
import TestimonialSection from '../../components/TestimonialSection';
import './Home.css';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Convert PDF to JSON with AI</h1>
          <p>Transform your PDF documents into structured, actionable data using advanced AI technology</p>
          <Link to="/services" className="cta-button">Try It Now</Link>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose PDFGenius</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>High Accuracy</h3>
            <p>Advanced AI ensures precise document processing</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Fast Processing</h3>
            <p>Handle multiple documents simultaneously</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>Enterprise-grade security for your documents</p>
          </div>
        </div>
      </section>

      <section className="industries-section">
        <h2>Specialized Solutions</h2>
        <div className="industry-grid">
          <div className="industry-card">
            <h3>Healthcare</h3>
            <p>Process medical records and claims efficiently</p>
          </div>
          <div className="industry-card">
            <h3>Legal</h3>
            <p>Extract data from legal documents and contracts</p>
          </div>
          <div className="industry-card">
            <h3>Finance</h3>
            <p>Automate financial document processing</p>
          </div>
        </div>
      </section>

      <TestimonialSection />
    </div>
  );
}
