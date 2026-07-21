const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  normalizeSyntheticEmail,
  validatePrototypePassword,
} = require('../config/prototype-data-policy');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

class AuthService {
  /**
   * Generate JWT token for user
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Login user
   */
  async login({ email, password }) {
    const normalizedEmail = normalizeSyntheticEmail(email);
    validatePrototypePassword(password);

    // Find user
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await user.update({ last_login: new Date() });

    const token = this.generateToken(user);

    return {
      user: user.toSafeJSON(),
      token
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toSafeJSON();
  }

}

module.exports = new AuthService();
