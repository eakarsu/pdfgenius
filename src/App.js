import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import Services from './pages/Services';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import Pricing from './pages/Pricing';
import Documentation from './pages/Documentation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Legal from './pages/Legal';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Comparison from './pages/Comparison';
import TableExtraction from './pages/TableExtraction';
import FormExtraction from './pages/FormExtraction';
import AIAnalysis from './pages/AIAnalysis';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <ErrorBoundary>
              <div className="app">
                <Navbar />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/docs" element={<Documentation />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/privacy-policy" element={<Legal initialTab="privacy" />} />
                  <Route path="/terms-and-conditions" element={<Legal initialTab="terms" />} />

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
                  <Route path="/comparison" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Comparison />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/table-extraction" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <TableExtraction />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/form-extraction" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <FormExtraction />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/ai-analysis" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <AIAnalysis />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Dashboard redirect to documents */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  } />
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
