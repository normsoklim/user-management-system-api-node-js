const User = require('../models/User');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Authentication middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
    
    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Get user from database with role populated
    const user = await User.findById(decoded.userId).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Attach user info to request object
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).populate('role');
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        };
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail the request
    logger.warn('Optional authentication failed:', error);
    next();
  }
};

/**
 * Middleware to check if user is authenticated (simpler version)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAuth
};