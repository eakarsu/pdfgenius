// src/components/Legal/LegalContainer.js
import React, { useState, useEffect } from 'react'; // Add useEffect import
import PrivacyPolicy from './PrivacyPolicy';
import TermsAndConditions from './TermsAndConditions';
import './LegalContainer.css';

const LegalContainer = ({ initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Add this useEffect hook to make the component respond to URL changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="legal-container">
      <div className="legal-tabs">
        <button
          className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
        <button
          className={`tab-button ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          Terms and Conditions
        </button>
      </div>

      <div className="legal-content">
        {activeTab === 'privacy' ? <PrivacyPolicy /> : <TermsAndConditions />}
      </div>
    </div>
  );
};

export default LegalContainer;

