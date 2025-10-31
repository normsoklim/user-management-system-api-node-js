const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class AuditLogger {
  /**
   * Log an action to the audit log
   * @param {Object} logData - Audit log data
   * @returns {Object} - Created audit log entry
   */
  static async log(logData) {
    try {
      // Add debug logging
      logger.info('Audit logging - Creating log with data:', JSON.stringify(logData));
      const auditLog = new AuditLog(logData);
      return await auditLog.save();
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Audit logging failed:', error);
      return null;
    }
  }
  
  /**
   * Middleware to automatically log user actions
   * @param {string} action - Action being performed
   * @param {string} resource - Resource being affected
   * @param {Object} options - Additional options
   * @returns {Function} - Express middleware
   */
  static auditAction(action, resource, options = {}) {
    return async (req, res, next) => {
      // Store original send function
      const originalSend = res.send;
      
      // Capture response data for successful requests
      let responseData = null;
      res.send = function(data) {
        responseData = data;
        originalSend.call(this, data);
      };
      
      // Proceed with request
      next();
      
      // After request completes, log the action
      res.on('finish', async () => {
        // Only log successful requests (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let userId = req.user ? req.user.userId : null;
          
          // For user creation, use the created user's ID
          if (!userId && action === 'CREATE_USER' && responseData) {
            try {
              const parsed = JSON.parse(responseData);
              // Check different possible response structures
              if (parsed.data && parsed.data._id) {
                userId = parsed.data._id;
              } else if (parsed._id) {
                userId = parsed._id;
              }
            } catch (error) {
              // Ignore parsing errors
            }
          }
          
          // For other actions, try to get userId from response
          if (!userId && responseData && action !== 'CREATE_USER') {
            try {
              const parsed = JSON.parse(responseData);
              if (parsed.data && parsed.data._id) {
                userId = parsed.data._id;
              } else if (parsed._id) {
                userId = parsed._id;
              }
            } catch (error) {
              // Ignore parsing errors
            }
          }
          
          // For CREATE_USER, if we still don't have userId, use the authenticated user
          if (!userId && action === 'CREATE_USER' && req.user && req.user.userId) {
            userId = req.user.userId;
          }
          
          // Create log data - userId can be null for some system actions
          const logData = {
            userId,
            action,
            resource,
            resourceId: AuditLogger.extractResourceId(req, options),
            before: options.captureBefore ? AuditLogger.sanitizeData(req.body) : null,
            after: AuditLogger.extractAfterData(responseData, options),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          };
          
          // Log the action (userId can be null for some actions)
          await AuditLogger.log(logData);
        }
      });
    };
  }
  
  /**
   * Extract resource ID from request
   * @param {Object} req - Express request object
   * @param {Object} options - Options object
   * @returns {string|null} - Resource ID
   */
  static extractResourceId(req, options) {
    // Use custom extractor if provided
    if (options.resourceIdExtractor) {
      return options.resourceIdExtractor(req);
    }
    
    // Default to ID from URL parameters
    return req.params.id || null;
  }
  
  /**
   * Extract after data from response
   * @param {string} responseData - Response data as string
   * @param {Object} options - Options object
   * @returns {Object|null} - Parsed after data
   */
  static extractAfterData(responseData, options) {
    if (!responseData || !options.captureAfter) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(responseData);
      // Remove sensitive data
      if (parsed.data && parsed.data.password) {
        delete parsed.data.password;
      }
      return parsed.data || parsed;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Sanitize data by removing sensitive information
   * @param {Object} data - Data to sanitize
   * @returns {Object} - Sanitized data
   */
  static sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }
  
  /**
   * Log authentication events
   * @param {string} action - Action (LOGIN, LOGOUT, FAILED_LOGIN)
   * @param {Object} req - Express request object
   * @param {Object} user - User object (if available)
   * @param {Object} additionalData - Additional data to log
   */
  static async logAuthEvent(action, req, user = null, additionalData = {}) {
    const logData = {
      userId: user ? user._id : null,
      action,
      resource: 'auth',
      resourceId: user ? user._id : null,
      before: null,
      after: additionalData,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    await this.log(logData);
  }
  
  /**
   * Log user actions manually
   * @param {string} action - Action performed
   * @param {string} resource - Resource affected
   * @param {string} resourceId - Resource ID
   * @param {Object} user - User performing the action
   * @param {Object} before - State before change
   * @param {Object} after - State after change
   * @param {Object} req - Express request object
   */
  static async logUserAction(action, resource, resourceId, user, before = null, after = null, req = null) {
    const logData = {
      userId: user._id,
      action,
      resource,
      resourceId,
      before: this.sanitizeData(before),
      after: this.sanitizeData(after),
      ipAddress: req ? (req.ip || req.connection.remoteAddress) : null,
      userAgent: req ? req.get('User-Agent') : null
    };
    
    await this.log(logData);
  }
}

module.exports = AuditLogger;