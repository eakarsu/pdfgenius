// src/components/Legal/TermsAndConditions.js
import React from 'react';
import LegalDocumentViewer from './LegalDocumentViewer';

const TermsAndConditions = () => {
  return (
    <div className="terms-conditions">
      <h1>Terms and Conditions</h1>
      <p className="last-updated">Last Updated: April 14, 2025</p>
      <LegalDocumentViewer documentPath="/legal/TermsAndConditions.md" />
    </div>
  );
};

export default TermsAndConditions;

