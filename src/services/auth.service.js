const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'pdfgenius-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
   * Register new user
   */
  async signup({ email, password, name }) {
    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user (password will be hashed by model hook)
    const user = await User.create({
      email,
      password_hash: password,
      name
    });

    const token = this.generateToken(user);

    return {
      user: user.toSafeJSON(),
      token
    };
  }

  /**
   * Login user
   */
  async login({ email, password }) {
    // Find user
    const user = await User.findOne({ where: { email } });
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

  /**
   * Update user profile
   */
  async updateProfile(id, updates) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow specific fields to be updated
    const allowedUpdates = ['name', 'email'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    await user.update(filteredUpdates);
    return user.toSafeJSON();
  }

  /**
   * Change password
   */
  async changePassword(id, { currentPassword, newPassword }) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isValid = await user.validatePassword(currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await user.update({ password_hash: newPassword });
    return { message: 'Password updated successfully' };
  }
}

module.exports = new AuthService();
