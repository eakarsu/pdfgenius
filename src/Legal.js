// src/pages/Legal.js
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import LegalContainer from '../components/Legal/LegalContainer';

const Legal = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'privacy';
  
  return (
    <div className="legal-page">
      <LegalContainer initialTab={tab} />
    </div>
  );
};

export default Legal;

