import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [resetLink, setResetLink] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // In dev mode, show the reset link directly
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        throw new Error(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h1>Forgot Password</h1>
        <p className="subtitle">Enter your email address and we'll send you a link to reset your password.</p>

        {success ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h3>Check your email</h3>
            <p>If an account exists with that email, a password reset link has been sent.</p>
            {resetLink && (
              <div className="dev-reset-link">
                <p><strong>Dev Mode:</strong> Use this link to reset your password:</p>
                <Link to={resetLink.replace(window.location.origin, '')}>{resetLink}</Link>
              </div>
            )}
            <Link to="/login" className="back-to-login">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="form-footer">
              <Link to="/login">Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
