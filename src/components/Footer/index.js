import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>PDFGenius</h3>
          <p>Transform your PDF documents into structured, actionable data using advanced AI technology.</p>
          <div className="social-links">
            <a href="#"><i className="fab fa-twitter"></i></a>
            <a href="#"><i className="fab fa-linkedin"></i></a>
            <a href="#"><i className="fab fa-github"></i></a>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/documentation">Documentation</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Services</h4>
          <ul>
            <li><Link to="/services">PDF to JSON</Link></li>
            <li><Link to="/services">Data Extraction</Link></li>
            <li><Link to="/services">Document Processing</Link></li>
            <li><Link to="/services">AI Solutions</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact Us</h4>
          <ul>
            <li>Email: support@pdfgenius.com</li>
            <li>Phone: +1 (555) 123-4567</li>
            <li>Address: 123 Tech Street</li>
            <li>City, State 12345</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} PDFGenius. All rights reserved.</p>
      </div>
    </footer>
  );
}
