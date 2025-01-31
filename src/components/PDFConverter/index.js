// src/components/PDFConverter/index.js
import React, { useState } from 'react';
import axios from 'axios';
import { pdfjs } from 'react-pdf';
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

  const makeAIRequest = async (model, base64Image, apiKey, customPrompt = null) => {
    const defaultPrompt = "Extract all information from this document page and return as JSON data. Include any measurements, specifications, and details exactly as shown.";
    
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model, // e.g., "amazon/nova-pro-v1" or "anthropic/claude-3-sonnet-20240229"
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: customPrompt || defaultPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'Content-Type': 'application/json'
        }
      });
  
      return response.data;
    } catch (error) {
      console.error('AI Request Error:', error);
      throw error;
    }
  };
  
  // Usage examples:
  // With Nova Pro
  const novaPro = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "amazon/nova-pro-v1", 
      base64Image, 
      apiKey
    );
    return result;
  };
  
  // With Claude Sonnet
  const claudeSonnet = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "anthropic/claude-3-sonnet-20240229", 
      base64Image, 
      apiKey
    );
    return result;
  };
  
  // With custom prompt
  const customRequest = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "amazon/nova-pro-v1", 
      base64Image, 
      apiKey,
      "Extract only the table data from this image and return as JSON"
    );
    return result;
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
        const aiResponse = novaPro(base64Images[i],apiKey)

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
    <div className="converter-container">
      <div className="file-upload-area">
        <input 
          type="file" 
          id="fileInput" 
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <label htmlFor="fileInput" className="browse-button">
          Browse...
        </label>
        <div className="file-status">
          {file ? file.name : 'No file selected'}
        </div>
      </div>
  
      <button 
        className="convert-button"
        disabled={!file || loading}
        onClick={processFile}
      >
        {loading ? 'Converting...' : 'Convert to JSON'}
      </button>
  
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
