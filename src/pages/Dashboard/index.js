
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState([]);
  const [usage, setUsage] = useState({
    pagesProcessed: 0,
    apiCalls: 0,
    storage: 0
  });

  useEffect(() => {
    // Fetch user's documents and usage statistics
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    // Add your API calls here
    // const response = await fetchUserDocuments();
    // setDocuments(response.documents);
    // setUsage(response.usage);
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="dashboard-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Pages Processed</h3>
                <div className="stat-value">{usage.pagesProcessed}</div>
                <div className="stat-change positive">+12% from last month</div>
              </div>
              <div className="stat-card">
                <h3>API Calls</h3>
                <div className="stat-value">{usage.apiCalls}</div>
                <div className="stat-change positive">+8% from last month</div>
              </div>
              <div className="stat-card">
                <h3>Storage Used</h3>
                <div className="stat-value">{usage.storage}GB</div>
                <div className="stat-change negative">-2% from last month</div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {documents.slice(0, 5).map((doc, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-file-pdf"></i>
                    </div>
                    <div className="activity-details">
                      <h4>{doc.name}</h4>
                      <p>{new Date(doc.date).toLocaleDateString()}</p>
                    </div>
                    <div className="activity-status">
                      <span className={`status ${doc.status}`}>{doc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="dashboard-documents">
            <div className="documents-header">
              <h3>All Documents</h3>
              <button className="upload-button">
                <i className="fas fa-upload"></i>
                Upload New
              </button>
            </div>

            <div className="documents-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={index}>
                      <td>
                        <div className="document-name">
                          <i className="fas fa-file-pdf"></i>
                          {doc.name}
                        </div>
                      </td>
                      <td>{new Date(doc.date).toLocaleDateString()}</td>
                      <td>{doc.size}MB</td>
                      <td>
                        <span className={`status ${doc.status}`}>{doc.status}</span>
                      </td>
                      <td>
                        <div className="document-actions">
                          <button className="action-button">
                            <i className="fas fa-download"></i>
                          </button>
                          <button className="action-button">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="dashboard-settings">
            <div className="settings-section">
              <h3>Account Settings</h3>
              <form className="settings-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" defaultValue="John Doe" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" defaultValue="john@example.com" />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" defaultValue="Acme Inc" />
                </div>
                <button type="submit" className="save-button">
                  Save Changes
                </button>
              </form>
            </div>

            <div className="settings-section">
              <h3>API Keys</h3>
              <div className="api-keys">
                <div className="api-key">
                  <div className="key-info">
                    <h4>Production Key</h4>
                    <p>••••••••••••••••</p>
                  </div>
                  <button className="copy-button">
                    <i className="fas fa-copy"></i>
                    Copy
                  </button>
                </div>
                <div className="api-key">
                  <div className="key-info">
                    <h4>Test Key</h4>
                    <p>••••••••••••••••</p>
                  </div>
                  <button className="copy-button">
                    <i className="fas fa-copy"></i>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <nav className="dashboard-nav">
          <ul>
            <li 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-home"></i>
              Overview
            </li>
            <li 
              className={activeTab === 'documents' ? 'active' : ''}
              onClick={() => setActiveTab('documents')}
            >
              <i className="fas fa-file-alt"></i>
              Documents
            </li>
            <li 
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <i className="fas fa-cog"></i>
              Settings
            </li>
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          <div className="user-menu">
            <div className="notifications">
              <i className="fas fa-bell"></i>
              <span className="notification-badge">3</span>
            </div>
            <div className="user-profile">
              <img src="/profile-placeholder.jpg" alt="User" />
              <span>John Doe</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}


