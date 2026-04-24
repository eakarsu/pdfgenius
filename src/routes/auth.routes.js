const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * POST /api/auth/signup
 * Register new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters'
      });
    }

    const result = await authService.signup({ email, password, name });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(400).json({
      error: 'Signup failed',
      message: error.message
    });
  }
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
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
router.post('/logout', authenticate, (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  // In production, you might add token to a blacklist
  res.json({
    success: true,
    message: 'Logout successful'
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
      message: error.message
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await authService.updateProfile(req.userId, { name, email });

    res.json({
      success: true,
      message: 'Profile updated',
      user
    });
  } catch (error) {
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current and new passwords are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New password must be at least 6 characters'
      });
    }

    const result = await authService.changePassword(req.userId, {
      currentPassword,
      newPassword
    });

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      error: 'Password change failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email is required'
      });
    }

    const result = await authService.requestPasswordReset(email);

    res.json({
      success: true,
      message: result.message,
      // In dev mode, return the reset link for testing
      ...(process.env.NODE_ENV !== 'production' && {
        resetLink: result.resetLink,
        token: result.token
      })
    });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({
      error: 'Request failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters'
      });
    }

    const result = await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(400).json({
      error: 'Reset failed',
      message: error.message
    });
  }
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
