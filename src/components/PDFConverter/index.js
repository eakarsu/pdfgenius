// src/components/PDFConverter/index.js
import React, { useState } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import './PDFConverter.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
//pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
//pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function PDFConverter() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFile(file);
  };

  const convertPdfToBase64Images = async (pdfFile) => {
    const pdf = await pdfjs.getDocument(URL.createObjectURL(pdfFile)).promise;
    const images = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      images.push(canvas.toDataURL('image/jpeg').split(',')[1]);
    }
    
    return images;
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      const base64Images = await convertPdfToBase64Images(file);
      let allData = [];
      
      const apiKey = process.env.REACT_APP_OPENROUTER_KEY;
      //const apiKey =   import.meta.env.VITE_OPENROUTER_KEY
      if (!apiKey) {
          console.error('API key is not defined');
          return;
      }else {
          console.error('API key Defined')
      }

      for (let i = 0; i < base64Images.length; i++) {
        const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: "anthropic/claude-3-sonnet-20240229",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all information from this document page and return as JSON data. Include any measurements, specifications, and details exactly as shown."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Images[i]}`
                  }
                }
              ]
            }
          ]
        }, {
          headers: {
            //'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'Content-Type': 'application/json'
          }
        });
        
        if (aiResponse.data?.choices?.[0]) {
          const pageData = aiResponse.data.choices[0].message.content;
          allData.push({
            page: i + 1,
            data: pageData
          });
        }
      }
      setResult(allData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-converter">
      <div className="converter-header">
        <img src="/lowes-logo.png" alt="Company Logo" className="logo" />
        <h2>PDF to JSON Converter</h2>
        <p>Upload your PDF document to convert it to structured JSON data</p>
      </div>
      
      <div className="upload-section">
        <input 
          type="file" 
          accept=".pdf"
          onChange={handleFileUpload}
          className="file-input"
        />
        <button 
          onClick={processFile} 
          disabled={!file || loading}
          className="convert-button"
        >
          {loading ? 'Processing...' : 'Convert to JSON'}
        </button>
      </div>

      {result && (
        <div className="results-section">
          {result.map((page, index) => {
            let pageData;
            try {
              pageData = typeof page.data === 'string' ? JSON.parse(page.data) : page.data;
            } catch (e) {
              pageData = page.data;
            }
            return (
              <div key={index} className="page-content">
                <h3>Page {page.page}</h3>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pageData || {}).map(([key, value], i) => (
                        <tr key={i}>
                          <td className="field-name">{key}</td>
                          <td className="field-value">
                            {typeof value === 'object' 
                              ? JSON.stringify(value, null, 2)
                              : value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
