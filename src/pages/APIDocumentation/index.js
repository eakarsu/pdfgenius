
import React, { useState } from 'react';
import { CopyBlock, dracula } from 'react-code-blocks';
import './APIDocumentation.css';

export default function APIDocumentation() {
  const [activeSection, setActiveSection] = useState('introduction');

  const codeExamples = {
    authentication: `
const PDFGenius = require('pdfgenius-sdk');
const client = new PDFGenius('YOUR_API_KEY');

// Using API directly
fetch('https://api.pdfgenius.com/v1/convert', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/document.pdf'
  })
});`,
    
    conversion: `
// Convert PDF to JSON
const result = await client.convert({
  file: 'path/to/document.pdf',
  outputFormat: 'json',
  options: {
    extractTables: true,
    preserveFormatting: true
  }
});

// Process multiple documents
const results = await client.batchConvert([
  'document1.pdf',
  'document2.pdf'
]);`,

    templates: `
// Create a template
const template = await client.createTemplate({
  name: 'Invoice Template',
  fields: [
    { name: 'invoice_number', type: 'string' },
    { name: 'total_amount', type: 'number' },
    { name: 'date', type: 'date' }
  ]
});

// Use template for conversion
const result = await client.convert({
  file: 'invoice.pdf',
  templateId: template.id
});`
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/v1/convert',
      description: 'Convert a PDF document to JSON',
      parameters: [
        { name: 'file', type: 'File', required: true, description: 'The PDF file to convert' },
        { name: 'outputFormat', type: 'string', required: false, description: 'Desired output format (json, xml)' },
        { name: 'templateId', type: 'string', required: false, description: 'Template ID for structured extraction' }
      ]
    },
    {
      method: 'POST',
      path: '/v1/templates',
      description: 'Create a new template',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Template name' },
        { name: 'fields', type: 'array', required: true, description: 'Array of field definitions' }
      ]
    },
    {
      method: 'GET',
      path: '/v1/templates',
      description: 'List all templates',
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number for pagination' },
        { name: 'limit', type: 'number', required: false, description: 'Number of items per page' }
      ]
    }
  ];

  return (
    <div className="api-documentation">
      <aside className="api-sidebar">
        <nav>
          <ul>
            <li 
              className={activeSection === 'introduction' ? 'active' : ''}
              onClick={() => setActiveSection('introduction')}
            >
              Introduction
            </li>
            <li 
              className={activeSection === 'authentication' ? 'active' : ''}
              onClick={() => setActiveSection('authentication')}
            >
              Authentication
            </li>
            <li 
              className={activeSection === 'endpoints' ? 'active' : ''}
              onClick={() => setActiveSection('endpoints')}
            >
              Endpoints
            </li>
            <li 
              className={activeSection === 'sdk' ? 'active' : ''}
              onClick={() => setActiveSection('sdk')}
            >
              SDK Usage
            </li>
          </ul>
        </nav>
      </aside>

      <main className="api-content">
        {activeSection === 'introduction' && (
          <section>
            <h1>API Documentation</h1>
            <p>Welcome to the PDFGenius API documentation. Our API enables you to convert PDF documents to structured JSON data and perform advanced document processing operations.</p>
            
            <h2>Getting Started</h2>
            <ol>
              <li>Sign up for a PDFGenius account</li>
              <li>Obtain your API key from the dashboard</li>
              <li>Install our SDK or make direct API calls</li>
            </ol>
          </section>
        )}

        {activeSection === 'authentication' && (
          <section>
            <h2>Authentication</h2>
            <p>PDFGenius uses API keys to authenticate requests. You can view and manage your API keys in the dashboard.</p>
            
            <div className="code-example">
              <h3>Example Request</h3>
              <CopyBlock
                text={codeExamples.authentication}
                language="javascript"
                theme={dracula}
                showLineNumbers={true}
              />
            </div>
          </section>
        )}

        {activeSection === 'endpoints' && (
          <section>
            <h2>API Endpoints</h2>
            
            {endpoints.map((endpoint, index) => (
              <div key={index} className="endpoint-card">
                <div className="endpoint-header">
                  <span className={`method ${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                  <code>{endpoint.path}</code>
                </div>
                <p>{endpoint.description}</p>
                
                <h4>Parameters</h4>
                <table className="parameters-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.parameters.map((param, paramIndex) => (
                      <tr key={paramIndex}>
                        <td>{param.name}</td>
                        <td><code>{param.type}</code></td>
                        <td>{param.required ? 'Yes' : 'No'}</td>
                        <td>{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        {activeSection === 'sdk' && (
          <section>
            <h2>SDK Usage</h2>
            
            <div className="code-example">
              <h3>Document Conversion</h3>
              <CopyBlock
                text={codeExamples.conversion}
                language="javascript"
                theme={dracula}
                showLineNumbers={true}
              />
            </div>

            <div className="code-example">
              <h3>Working with Templates</h3>
              <CopyBlock
                text={codeExamples.templates}
                language="javascript"
                theme={dracula}
                showLineNumbers={true}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

