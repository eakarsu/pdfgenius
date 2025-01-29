import React, { useState } from 'react';
import './Services.css';

export default function Services() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      return;
    }
    try {
      // Add conversion logic here
      console.log('Converting file:', selectedFile.name);
    } catch (error) {
      console.error('Conversion error:', error);
    }
  };

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
          <div className="company-logo">
            <h2>PDF to JSON Converter</h2>
            <p>Upload your PDF document to convert it to structured JSON data</p>
          </div>
          
          <div className="file-upload-area">
            <input 
              type="file" 
              id="fileInput" 
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <label htmlFor="fileInput" className="browse-button">
              Browse...
            </label>
            <div className="file-status">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </div>
          </div>

          <button 
            className="convert-button" 
            disabled={!selectedFile}
            onClick={handleConvert}
          >
            Convert to JSON
          </button>
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
