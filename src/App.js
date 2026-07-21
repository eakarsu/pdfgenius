import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/Toast/ToastContext';
import { ConfirmProvider } from './components/ConfirmDialog/ConfirmContext';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <ErrorBoundary>
              <div className="app">
                <Navbar />
                <div
                  role="status"
                  style={{ background: '#7f1d1d', color: '#fff', padding: '10px 16px', textAlign: 'center', fontWeight: 700 }}
                >
                  Unsupported local prototype — synthetic data only — deployment prohibited
                </div>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />

                  {/* Protected routes */}
                  <Route path="/documents" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Documents />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/documents/:id" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <DocumentDetail />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={<Navigate to="/documents" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Footer />
              </div>
            </ErrorBoundary>
            <ToastContainer />
            <ConfirmDialog />
          </Router>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
