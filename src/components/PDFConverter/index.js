// src/components/PDFConverter/index.js
import React, { useState } from 'react';
import axios from 'axios';
import { pdfjs } from 'react-pdf';
import './PDFConverter.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Get the API URL from environment variables or use a default
const API_URL = process.env.REACT_APP_API_URL + '/api';
const document_extensions = ['.pdf', '.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm', 
  '.xls', '.xlsx', '.xlsm', '.xlt', '.xltx', '.xltm', '.xlsb',
  '.ppt', '.pptx', '.pptm', '.pot', '.potx', '.potm', 
  '.ppsx', '.ppsm', '.sldx', '.sldm']

export default function DocumentConverter() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      // Check if the file ends with any of the supported extensions
      const isSupported = document_extensions.some(ext => fileName.endsWith(ext));
      if (isSupported) {
        setFile(selectedFile);
        setResult(null);
        setError(null);
      } else {
        setError("Unsupported file type. Please upload a PDF or Word document (.doc or .docx)");
        event.target.value = null;
        setFile(null);
      }
    }
  };

  const makeAIRequest = async (model, base64Image, apiKey, customPrompt = null) => {
    const defaultPrompt = "Extract all information from this document page and return as JSON data. Include any measurements, specifications, and details exactly as shown.";
    
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: model,
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
  
  const metaMaverick = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "meta-llama/llama-4-maverick:free", 
      base64Image, 
      apiKey
    );
    return result;
  };

  const novaPro = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "amazon/nova-pro-v1", 
      base64Image, 
      apiKey
    );
    return result;
  };

  const googleGemini = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "google/gemini-2.5-pro-preview", 
      base64Image, 
      apiKey
    );
    return result;
  };

  const openaiGPT = async (base64Image, apiKey) => {
    const result = await makeAIRequest(
      "openai/gpt-4.1", 
      base64Image, 
      apiKey
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

  // Word document processing function using backend service
  const convertWordToBase64Images = async (wordFile) => {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('document', wordFile);
      
      // Send to backend for processing
      const response = await axios.post(`${API_URL}/convert-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.images) {
        return response.data.images;
      } else {
        throw new Error("Failed to convert Word document to images");
      }
    } catch (error) {
      console.error('Error converting Word document:', error);
      throw error;
    }
  };

  const processFile = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      let base64Images = [];
      const fileName = file.name.toLowerCase();
      // Check if the file ends with any of the supported extensions
      const isSupported = document_extensions.some(ext => fileName.endsWith(ext));
      // Process based on file type
      if (isSupported){
        if (fileName.endsWith('.pdf')) {
          base64Images = await convertPdfToBase64Images(file);
        } else {
          base64Images = await convertWordToBase64Images(file);
        
        }
      } else {
        throw new Error("Unsupported file type");
      }
      
      if (base64Images.length === 0) {
        throw new Error("No pages could be extracted from the document");
      }
      
      const apiKey = process.env.REACT_APP_OPENROUTER_KEY;
  
      if (!apiKey) {
        setError('API key is not defined');
        return;
      }
  
      // Create an array of promises for parallel processing
      const requests = base64Images.map((base64Image, index) => {
        return openaiGPT(base64Image, apiKey)
          .then((aiResponse) => {
            if (aiResponse?.choices?.[0]) {
              let pageData = aiResponse.choices[0].message.content;
              console.log(`Response for page ${index + 1}:`, pageData);
  
              if (typeof pageData === 'string') {
                // Clean up the response
                pageData = pageData.replace(/^```json\s*/, '')
                                 .replace(/```\s*$/, '')
                                 .replace(/\\'/g, "'");
                try {
                  pageData = JSON.parse(pageData);
                } catch (e) {
                  console.error(`Failed to parse JSON for page ${index + 1}:`, e);
                  pageData = { error: 'Invalid response format' };
                }
              }
  
              return {
                page: index + 1,
                data: pageData
              };
            }
            
            return {
              page: index + 1,
              data: { error: 'No valid response from AI' }
            };
          })
          .catch((error) => {
            console.error(`Error processing page ${index + 1}:`, error);
            return {
              page: index + 1,
              data: { error: 'Failed to process page' }
            };
          });
      });
  
      // Wait for all requests to complete in parallel
      const allData = await Promise.all(requests);
      setResult(allData);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'An unknown error occurred');
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
          accept={document_extensions}
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
      
      {error && <div className="error-message">{error}</div>}
  
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

