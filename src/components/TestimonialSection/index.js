import React from 'react';
import './TestimonialSection.css';

export default function TestimonialSection() {
  return (
    <section className="testimonial-section">
      <h2>What Our Users Say</h2>
      <div className="testimonial-grid">
        <div className="testimonial-card">
          <p>"This tool has revolutionized our document processing workflow."</p>
          <div className="testimonial-author">
            <h4>John Doe</h4>
            <p>Technical Director, Tech Corp</p>
          </div>
        </div>
        <div className="testimonial-card">
          <p>"Incredibly accurate and time-saving solution."</p>
          <div className="testimonial-author">
            <h4>Jane Smith</h4>
            <p>Operations Manager, Data Inc</p>
          </div>
        </div>
      </div>
    </section>
  );
}
