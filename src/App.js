// === Batch 11 Gaps & Frontend Mounts ===
import GapOcrPipelinePage from './pages/gap/GapOcrPipelinePage'
import GapPdfClassifierPage from './pages/gap/GapPdfClassifierPage'
import GapTranslationRagPage from './pages/gap/GapTranslationRagPage'
import GapStructuredExportPage from './pages/gap/GapStructuredExportPage'
import GapCollaborationCommentingPage from './pages/gap/GapCollaborationCommentingPage'
import GapVersioningPage from './pages/gap/GapVersioningPage'
import GapWatermarkingDrmPage from './pages/gap/GapWatermarkingDrmPage'
import GapBatchProcessingPage from './pages/gap/GapBatchProcessingPage'
import GapEsignIntegrationPage from './pages/gap/GapEsignIntegrationPage'
import GapSsoEnterprisePage from './pages/gap/GapSsoEnterprisePage'
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
import AIClassify from './pages/AIClassify';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RagChat from './pages/RagChat';
import Templates from './pages/Templates';
import Redline from './pages/Redline';
import AIUsage from './pages/AIUsage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

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
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

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
                  <Route path="/ai-classify" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <AIClassify />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  <Route path="/rag-chat" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <RagChat />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/templates" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Templates />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/redline/:id" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Redline />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="/ai-usage" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <AIUsage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />

                  {/* Dashboard redirect to documents */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  } />
                  {/* === Batch 11 Gaps & Frontend Mounts === */}
                  <Route path="/gap/ocr-pipeline" element={<GapOcrPipelinePage />} />
                  <Route path="/gap/pdf-classifier" element={<GapPdfClassifierPage />} />
                  <Route path="/gap/translation-rag" element={<GapTranslationRagPage />} />
                  <Route path="/gap/structured-export" element={<GapStructuredExportPage />} />
                  <Route path="/gap/collaboration-commenting" element={<GapCollaborationCommentingPage />} />
                  <Route path="/gap/versioning" element={<GapVersioningPage />} />
                  <Route path="/gap/watermarking-drm" element={<GapWatermarkingDrmPage />} />
                  <Route path="/gap/batch-processing" element={<GapBatchProcessingPage />} />
                  <Route path="/gap/esign-integration" element={<GapEsignIntegrationPage />} />
                  <Route path="/gap/sso-enterprise" element={<GapSsoEnterprisePage />} />
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
