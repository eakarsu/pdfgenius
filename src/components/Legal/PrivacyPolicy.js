// src/components/Legal/PrivacyPolicy.js
import React from 'react';
import LegalDocumentViewer from './LegalDocumentViewer';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy">
      <h1>Privacy Policy</h1>
      <p className="last-updated">Last Updated: April 14, 2025</p>
      <LegalDocumentViewer documentPath="/legal/PrivacyPolicy.md" />
    </div>
  );
};

export default PrivacyPolicy;

