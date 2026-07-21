const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * POST /api/auth/signup
 * Register new user
 */
router.post('/signup', async (req, res) => {
  res.status(503).json({
    error: 'Account provisioning unavailable',
    message: 'Use only a reviewer-controlled disposable integration fixture'
  });
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    const result = await authService.login({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({
      error: 'Login failed',
      message: 'Invalid synthetic email or password'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Client token removal acknowledged; server-side revocation is unavailable'
  });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(404).json({
      error: 'Not found',
      message: 'Synthetic user was not found'
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  res.status(503).json({
    error: 'Profile mutation unavailable',
    message: 'Account lifecycle is outside the retained prototype boundary'
  });
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, async (req, res) => {
  res.status(503).json({
    error: 'Password mutation unavailable',
    message: 'Account lifecycle is outside the retained prototype boundary'
  });
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  res.status(503).json({
    error: 'Password reset unavailable',
    message: 'No reviewed private notification channel is configured'
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  res.status(503).json({
    error: 'Password reset unavailable',
    message: 'No reviewed private notification channel is configured'
  });
});

/**
 * POST /api/auth/verify
 * Verify JWT token is valid
 */
router.post('/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.user
  });
});

module.exports = router;
