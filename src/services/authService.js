const User = require('../models/User');
const Role = require('../models/Role');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken
} = require('../utils/jwt');
const AuditLogger = require('../middleware/audit');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {Object} req - Express request object
   * @returns {Object} - Created user and tokens
   */
  static async register(userData, req) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Get default role if not provided
      let role;
      if (userData.roleId) {
        role = await Role.findById(userData.roleId);
        if (!role) {
          throw new Error('Invalid role ID');
        }
      } else {
        role = await Role.findOne({ name: 'user' });
        if (!role) {
          throw new Error('Default user role not found');
        }
      }
      // Create user
      const user = new User({
        ...userData,
        role: role._id
      });

      const savedUser = await user.save();
      
      // Populate role for response
      await savedUser.populate('role');

      // Generate tokens
      const accessToken = generateAccessToken(savedUser);
      const refreshToken = generateRefreshToken(savedUser);

      // Log user creation
      await AuditLogger.logUserAction(
        'CREATE_USER',
        'users',
        savedUser._id,
        savedUser,
        null,
        { firstName: savedUser.firstName, lastName: savedUser.lastName, email: savedUser.email },
        req
      );

      return {
        user: {
          _id: savedUser._id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          role: savedUser.role,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and generate tokens
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} req - Express request object
   * @returns {Object} - User and tokens
   */
  static async login(email, password, req) {
    try {
      // Find user with password
      const user = await User.findByEmailWithPassword(email);
      
      if (!user) {
        await AuditLogger.logAuthEvent('FAILED_LOGIN', req, null, { email });
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await AuditLogger.logAuthEvent('FAILED_LOGIN', req, user, { reason: 'Account deactivated' });
        throw new Error('Account is deactivated');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        await AuditLogger.logAuthEvent('FAILED_LOGIN', req, user, { email });
        throw new Error('Invalid credentials');
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Log successful login
      await AuditLogger.logAuthEvent('LOGIN', req, user);

      return {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @param {Object} req - Express request object
   * @returns {Object} - New tokens
   */
  static async refreshToken(refreshToken, req) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.userId).populate('role');
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {Object} req - Express request object
   * @returns {Object} - Reset token
   */
  static async forgotPassword(email, req) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal that user doesn't exist
        return { message: 'If an account with this email exists, a password reset link has been sent' };
      }

      // Generate reset token
      const resetToken = generatePasswordResetToken(user);
      
      // Save reset token to user
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // TODO: Send email with reset token
      // For now, just return the token (in production, this should be sent via email)
      
      await AuditLogger.logUserAction(
        'RESET_PASSWORD',
        'auth',
        user._id,
        user,
        null,
        { email },
        req
      );

      return { 
        message: 'If an account with this email exists, a password reset link has been sent',
        resetToken // Remove this in production
      };
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {Object} req - Express request object
   * @returns {Object} - Success message
   */
  static async resetPassword(token, newPassword, req) {
    try {
      // Verify reset token
      const decoded = verifyPasswordResetToken(token);
      
      // Find user with valid reset token
      const user = await User.findOne({
        _id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      await AuditLogger.logUserAction(
        'CHANGE_PASSWORD',
        'auth',
        user._id,
        user,
        null,
        { reason: 'Password reset' },
        req
      );

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {Object} user - User object
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {Object} req - Express request object
   * @returns {Object} - Success message
   */
  static async changePassword(user, currentPassword, newPassword, req) {
    try {
      // Find user with password
      const userWithPassword = await User.findById(user.userId).select('+password');
      
      if (!userWithPassword) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      userWithPassword.password = newPassword;
      await userWithPassword.save();

      await AuditLogger.logUserAction(
        'CHANGE_PASSWORD',
        'auth',
        userWithPassword._id,
        userWithPassword,
        null,
        { reason: 'Password change' },
        req
      );

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   * @param {Object} user - User object
   * @param {Object} req - Express request object
   * @returns {Object} - Success message
   */
  static async logout(user, req) {
    try {
      await AuditLogger.logAuthEvent('LOGOUT', req, user);
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}

module.exports = AuthService;