import React, { useState } from 'react';

import './Documentation.css';

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = {
    'getting-started': {
      title: 'Getting Started',
      content: `
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
      `
    },
    'pdf-to-json': {
      title: 'PDF to JSON',
      content: `
        <h2>PDF to JSON Conversion</h2>
        <p>Learn how to convert PDF documents to structured JSON data.</p>

        <h3>Features</h3>
        <ul>
          <li>Automatic field detection</li>
          <li>Custom field mapping</li>
          <li>Batch processing</li>
          <li>Template matching</li>
        </ul>

        <h3>Code Example</h3>
        <pre><code>
const result = await client.convertToJSON({
  file: document,
  options: {
    templateId: 'invoice-template',
    extractFields: ['date', 'amount', 'invoice_number']
  }
});
        </code></pre>
      `
    },
    'api-reference': {
      title: 'API Reference',
      content: `
        <h2>API Reference</h2>
        <p>Complete reference for all API endpoints and parameters.</p>

        <h3>Authentication</h3>
        <pre><code>
curl -X POST https://api.pdfgenius.com/v1/convert \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf"
        </code></pre>

        <h3>Endpoints</h3>
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Method</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/v1/convert</td>
              <td>POST</td>
              <td>Convert PDF to JSON</td>
            </tr>
            <tr>
              <td>/v1/templates</td>
              <td>GET</td>
              <td>List available templates</td>
            </tr>
          </tbody>
        </table>
      `
    }
  };

  return (
    <div className="documentation-page">
      <aside className="documentation-sidebar">
        <nav>
          <ul>
            {Object.entries(sections).map(([key, section]) => (
              <li 
                key={key}
                className={activeSection === key ? 'active' : ''}
                onClick={() => setActiveSection(key)}
              >
                {section.title}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="documentation-content">
        <div 
          dangerouslySetInnerHTML={{ 
            __html: sections[activeSection].content 
          }} 
        />
      </main>

      <div className="documentation-toc">
        <h4>On this page</h4>
        <ul>
          <li><a href="#getting-started">Getting Started</a></li>
          <li><a href="#installation">Installation</a></li>
          <li><a href="#basic-usage">Basic Usage</a></li>
        </ul>
      </div>
    </div>
  );
}

