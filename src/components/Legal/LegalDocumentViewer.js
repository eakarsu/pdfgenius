// src/components/Legal/LegalDocumentViewer.js
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const LegalDocumentViewer = ({ documentPath }) => {
  const [content, setContent] = useState('Loading...');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(documentPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }
        return response.text();
      })
      .then(text => {
        setContent(text);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading document:', err);
        setError('Failed to load the document. Please try again later.');
        setIsLoading(false);
      });
  }, [documentPath]);

  if (error) {
    return <div className="legal-document-error">{error}</div>;
  }

  return (
    <div className="legal-document-container">
      {isLoading ? (
        <div className="loading-spinner">Loading document...</div>
      ) : (
        <div className="legal-document-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default LegalDocumentViewer;

