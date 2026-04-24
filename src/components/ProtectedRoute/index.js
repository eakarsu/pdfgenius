import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { DetailSkeleton } from '../Skeleton';
import './index.css';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="protected-route-loading">
        <DetailSkeleton />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <div className="protected-route-error">
        <div className="error-container">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
