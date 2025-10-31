const UserService = require('../services/userService');
const logger = require('../utils/logger');

class UserController {
  /**
   * Get all users with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUsers(req, res) {
    try {
      const { page, limit, search, role, isActive, sortBy, sort } = req.query;
      const filters = { search, role, isActive };
      
      const result = await UserService.getUsers(
        filters,
        parseInt(page),
        parseInt(limit),
        sortBy,
        sort
      );
      
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get users controller error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users'
      });
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      
      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      logger.error('Get user by ID controller error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user'
      });
    }
  }

  /**
   * Create a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createUser(req, res) {
    try {
      // Prepare user data with avatar if uploaded
      const userData = {
        ...req.body,
        avatar: req.file ? `/uploads/${req.file.filename}` : null
      };
      
      // Address is now a simple string, no need to parse JSON
      
      const result = await UserService.createUser(userData, req.user, req);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result
      });
    } catch (error) {
      logger.error('Create user controller error:', error);
      
      if (error.message === 'User with this email already exists' ||
          error.message === 'Invalid role ID') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  /**
   * Update user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prepare update data with avatar if uploaded
      const updateData = {
        ...req.body,
        avatar: req.file ? `/uploads/${req.file.filename}` : undefined
      };
      
      // Address is now a simple string, no need to parse JSON
      
      const result = await UserService.updateUser(id, updateData, req.user, req);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update user controller error:', error);
      
      if (error.message === 'User not found' ||
          error.message === 'Email already exists' ||
          error.message === 'Invalid role ID') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  /**
   * Delete user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await UserService.deleteUser(id, req.user, req);
      
      res.json({
        success: true,
        message: 'User deleted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Delete user controller error:', error);
      
      if (error.message === 'User not found' || 
          error.message === 'Cannot delete your own account') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  /**
   * Update current user's profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateProfile(req, res) {
    try {
      // Prepare profile data with avatar if uploaded
      const profileData = {
        ...req.body,
        avatar: req.file ? `/uploads/${req.file.filename}` : undefined
      };
      
      // Address is now a simple string, no need to parse JSON
      
      const result = await UserService.updateProfile(profileData, req.user, req);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update profile controller error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  /**
   * Get audit logs for a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserAuditLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await UserService.getUserAuditLogs(id, parseInt(page), parseInt(limit));
      
      res.json({
        success: true,
        message: 'User audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get user audit logs controller error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user audit logs'
      });
    }
  }
}

module.exports = UserController;