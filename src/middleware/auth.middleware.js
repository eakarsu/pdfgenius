const authService = require('../services/auth.service');
const { User } = require('../models');

/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = authService.verifyToken(token);

    // Get user from database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Account is disabled'
      });
    }

    // Attach user to request
    req.user = user.toSafeJSON();
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't require auth
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = authService.verifyToken(token);
      const user = await User.findByPk(decoded.id);

      if (user && user.is_active) {
        req.user = user.toSafeJSON();
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Silent fail - continue without user
    next();
  }
};

/**
 * Admin Only Middleware
 * Requires user to have admin role
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }

  next();
};

/**
 * Rate Limiting Middleware (simple in-memory implementation)
 */
const rateLimitStore = new Map();

const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 60000; // 1 minute
  const max = options.max || 100; // 100 requests per window

  return (req, res, next) => {
    const key = req.userId || req.ip;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds`
      });
    }

    next();
  };
};

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

module.exports = {
  authenticate,
  optionalAuth,
  adminOnly,
  rateLimit
};
