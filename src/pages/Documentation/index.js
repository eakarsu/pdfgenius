import React, { useState } from 'react';
import './Documentation.css';

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <div className="documentation-page">
      <aside className="documentation-sidebar">
        <nav>
          <ul>
            <li 
              className={activeSection === 'getting-started' ? 'active' : ''}
              onClick={() => setActiveSection('getting-started')}
            >
              Getting Started
            </li>
            <li 
              className={activeSection === 'pdf-to-json' ? 'active' : ''}
              onClick={() => setActiveSection('pdf-to-json')}
            >
              PDF to JSON
            </li>
            <li 
              className={activeSection === 'api-reference' ? 'active' : ''}
              onClick={() => setActiveSection('api-reference')}
            >
              API Reference
            </li>
          </ul>
        </nav>
      </aside>

      <main className="documentation-content">
        <h2>Getting Started with PDFGenius</h2>
        <p>Welcome to PDFGenius documentation. This guide will help you get started with our PDF processing services.</p>
        
        <h3>Quick Start</h3>
        <ol>
          <li>Sign up for a PDFGenius account</li>
          <li>Get your API key from the dashboard</li>
          <li>Choose your integration method</li>
          <li>Start processing documents</li>
        </ol>

        <h3>Installation</h3>
        <pre><code>
          npm install pdfgenius-sdk
          # or
          yarn add pdfgenius-sdk
        </code></pre>

        <h3>Basic Usage</h3>
        <pre><code>
          import { PDFGenius } from 'pdfgenius-sdk';
          const client = new PDFGenius('YOUR_API_KEY');
          const result = await client.convertToJSON('path/to/document.pdf');
        </code></pre>
      </main>

      <aside className="documentation-toc">
        <h4>On this page</h4>
        <ul>
          <li><a href="#quick-start">Quick Start</a></li>
          <li><a href="#installation">Installation</a></li>
          <li><a href="#basic-usage">Basic Usage</a></li>
        </ul>
      </aside>
    </div>
  );
}
