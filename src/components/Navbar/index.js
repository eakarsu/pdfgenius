import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          PDFGenius
        </Link>

        <div className="mobile-menu-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </div>

        <ul className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
          </li>

          {isAuthenticated && (
            <>
              <li className="nav-item">
                <Link
                  to="/documents"
                  className={`nav-link ${location.pathname.startsWith('/documents') ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Documents
                </Link>
              </li>
              <li className="nav-item dropdown">
                <span className="nav-link dropdown-trigger">
                  Tools <i className="fas fa-chevron-down"></i>
                </span>
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/table-extraction" onClick={() => setIsMobileMenuOpen(false)}>
                      Table Extraction
                    </Link>
                  </li>
                  <li>
                    <Link to="/form-extraction" onClick={() => setIsMobileMenuOpen(false)}>
                      Form Extraction
                    </Link>
                  </li>
                  <li>
                    <Link to="/comparison" onClick={() => setIsMobileMenuOpen(false)}>
                      Compare Documents
                    </Link>
                  </li>
                  <li>
                    <Link to="/ai-analysis" onClick={() => setIsMobileMenuOpen(false)}>
                      AI Analysis
                    </Link>
                  </li>
                </ul>
              </li>
            </>
          )}

          <li className="nav-item">
            <Link
              to="/pricing"
              className={`nav-link ${location.pathname === '/pricing' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
          </li>
        </ul>

        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="user-menu-container" onClick={(e) => e.stopPropagation()}>
              <button
                className="user-menu-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-avatar">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
                <span className="user-name">{user?.name || 'User'}</span>
                <i className="fas fa-chevron-down"></i>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <span className="user-email">{user?.email}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/documents" className="dropdown-item">
                    <i className="fas fa-folder"></i> My Documents
                  </Link>
                  <Link to="/ai-analysis" className="dropdown-item">
                    <i className="fas fa-robot"></i> AI Analysis
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="login-btn">Login</Link>
              <Link to="/signup" className="signup-btn">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
