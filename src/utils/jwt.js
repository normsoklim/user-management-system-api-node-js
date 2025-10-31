const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Generate access token
 * @param {Object} user - User object
 * @returns {string} - JWT access token
 */
const generateAccessToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    roleId: user.role._id || user.role,
    permissions: user.role.permissions || []
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
  });
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    logger.error('Access token verification failed:', error);
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if not found
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Generate password reset token
 * @param {Object} user - User object
 * @returns {string} - Password reset token
 */
const generatePasswordResetToken = (user) => {
  const payload = {
    userId: user._id,
    type: 'password-reset'
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '1h' // Password reset tokens expire in 1 hour
  });
};

/**
 * Verify password reset token
 * @param {string} token - Password reset token
 * @returns {Object} - Decoded token payload
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    logger.error('Password reset token verification failed:', error);
    throw new Error('Invalid or expired password reset token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generatePasswordResetToken,
  verifyPasswordResetToken
};