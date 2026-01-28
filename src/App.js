import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/documents/:id" element={
              <ProtectedRoute>
                <DocumentDetail />
              </ProtectedRoute>
            } />
            <Route path="/comparison" element={
              <ProtectedRoute>
                <Comparison />
              </ProtectedRoute>
            } />
            <Route path="/table-extraction" element={
              <ProtectedRoute>
                <TableExtraction />
              </ProtectedRoute>
            } />
            <Route path="/form-extraction" element={
              <ProtectedRoute>
                <FormExtraction />
              </ProtectedRoute>
            } />
            <Route path="/ai-analysis" element={
              <ProtectedRoute>
                <AIAnalysis />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
