import React from 'react';
import './PDFConverter.css';

export default function PDFConverter() {
  return (
    <div className="pdf-converter">
      <div className="converter-header">
        <h2>Convert PDF to JSON</h2>
        <p>Upload your PDF document to convert it to structured JSON data</p>
      </div>
      
      <div className="upload-section">
        <input 
          type="file" 
          accept=".pdf"
          className="file-input"
        />
        <button className="convert-button">
          Convert to JSON
        </button>
      </div>
    </div>
  );
}
