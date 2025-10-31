const AuthService = require('../services/authService');
const logger = require('../utils/logger');
const {static} = require("express");

class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body, req);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      logger.error('Register controller error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Authenticate user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, req);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Login controller error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken, req);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Refresh token controller error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Send password reset email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email, req);
      
      res.json({
        success: true,
        message: result.message,
        data: result.resetToken ? { resetToken: result.resetToken } : null
      });
    } catch (error) {
      logger.error('Forgot password controller error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send password reset email'
      });
    }
  }

  /**
   * Reset user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword, req);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Reset password controller error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed'
      });
    }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user, currentPassword, newPassword, req);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Change password controller error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Password change failed'
      });
    }
  }

  /**
   * Logout user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async logout(req, res) {
    try {
      const result = await AuthService.logout(req.user, req);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Logout controller error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Logout failed'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProfile(req, res) {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId).populate('role');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      logger.error('Get profile controller error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }
}
module.exports = AuthController;