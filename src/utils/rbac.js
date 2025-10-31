const logger = require('./logger');

class RBAC {
  /**
   * Check if user has a specific permission
   * @param {Object} user - User object with role populated
   * @param {string} requiredPermission - Permission to check
   * @returns {boolean} - True if user has permission
   */
  static hasPermission(user, requiredPermission) {
    // Check if user exists and has role
    if (!user || !user.role) {
      logger.warn('User or role not found for permission check');
      return false;
    }

    // Super admin has all permissions
    if (user.role.permissions && user.role.permissions.includes('*:*')) {
      return true;
    }
    
    // Check for exact permission
    if (user.role.permissions && user.role.permissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check for wildcard permissions (e.g., "user:*")
    const [resource, action] = requiredPermission.split(':');
    if (user.role.permissions && user.role.permissions.includes(`${resource}:*`)) {
      return true;
    }
    
    // Special case for self permissions
    if (requiredPermission.endsWith(':self')) {
      const basePermission = requiredPermission.replace(':self', '');
      return this.hasPermission(user, basePermission);
    }
    
    return false;
  }
  
  /**
   * Check if user can access their own resource
   * @param {Object} user - User object
   * @param {string} resourceUserId - ID of the resource owner
   * @param {string} requiredPermission - Permission to check
   * @returns {boolean} - True if user can access resource
   */
  static canAccessResource(user, resourceUserId, requiredPermission) {
    // If user is the resource owner, check self permissions
    if (user.userId && user.userId.toString() === resourceUserId.toString()) {
      const selfPermission = requiredPermission + ':self';
      return this.hasPermission(user, selfPermission);
    }
    
    // Otherwise, check regular permissions
    return this.hasPermission(user, requiredPermission);
  }
  
  /**
   * Middleware to check permissions
   * @param {string} requiredPermission - Permission required for route
   * @returns {Function} - Express middleware function
   */
  static checkPermission(requiredPermission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication required' 
        });
      }
      
      if (!this.hasPermission(req.user, requiredPermission)) {
        logger.warn(`Permission denied for user ${req.user.userId}: ${requiredPermission}`);
        return res.status(403).json({ 
          success: false,
          message: 'Insufficient permissions' 
        });
      }
      
      next();
    };
  }
  
  /**
   * Middleware to check if user can access their own resource
   * @param {string} requiredPermission - Permission required for route
   * @param {string} userIdParam - Parameter name containing user ID (default: 'id')
   * @returns {Function} - Express middleware function
   */
  static checkSelfPermission(requiredPermission, userIdParam = 'id') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: 'Authentication required' 
        });
      }
      
      const resourceUserId = req.params[userIdParam];
      
      if (!this.canAccessResource(req.user, resourceUserId, requiredPermission)) {
        logger.warn(`Self permission denied for user ${req.user.userId}: ${requiredPermission}`);
        return res.status(403).json({ 
          success: false,
          message: 'Insufficient permissions' 
        });
      }
      
      next();
    };
  }
  
  /**
   * Get all permissions for a user
   * @param {Object} user - User object with role populated
   * @returns {Array} - Array of permissions
   */
  static getUserPermissions(user) {
    if (!user || !user.role || !user.role.permissions) {
      return [];
    }
    
    return user.role.permissions;
  }
  
  /**
   * Check if user has any of the specified permissions
   * @param {Object} user - User object with role populated
   * @param {Array} permissions - Array of permissions to check
   * @returns {boolean} - True if user has any of the permissions
   */
  static hasAnyPermission(user, permissions) {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.some(permission => this.hasPermission(user, permission));
  }
  
  /**
   * Check if user has all of the specified permissions
   * @param {Object} user - User object with role populated
   * @param {Array} permissions - Array of permissions to check
   * @returns {boolean} - True if user has all permissions
   */
  static hasAllPermissions(user, permissions) {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.every(permission => this.hasPermission(user, permission));
  }
}

module.exports = RBAC;