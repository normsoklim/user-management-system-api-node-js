const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Get audit logs with pagination and filtering
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated audit logs
   */
  static async getAuditLogs(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.userId) {
        query.userId = filters.userId;
      }
      
      if (filters.action) {
        query.action = filters.action;
      }
      
      if (filters.resource) {
        query.resource = filters.resource;
      }
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.timestamp.$lte = new Date(filters.endDate);
        }
      }
      
      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email'),
        AuditLog.countDocuments(query)
      ]);
      
      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   * @param {string} logId - Audit log ID
   * @returns {Object} - Audit log object
   */
  static async getAuditLogById(logId) {
    try {
      const log = await AuditLog.getAuditLogById(logId);
      
      if (!log) {
        throw new Error('Audit log not found');
      }
      
      return log;
    } catch (error) {
      logger.error('Get audit log by ID error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * @param {string} userId - User ID
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Object} - Paginated audit logs
   */
  static async getUserAuditLogs(userId, filters = {}, page = 1, limit = 10) {
    try {
      // Verify user exists
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Combine userId with other filters
      const allFilters = { ...filters, userId };
      
      return await this.getAuditLogs(allFilters, page, limit);
    } catch (error) {
      logger.error('Get user audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Filter options
   * @returns {Object} - Audit statistics
   */
  static async getAuditStatistics(filters = {}) {
    try {
      const matchStage = {};
      
      // Apply filters
      if (filters.userId) {
        matchStage.userId = mongoose.Types.ObjectId(filters.userId);
      }
      
      if (filters.startDate || filters.endDate) {
        matchStage.timestamp = {};
        if (filters.startDate) {
          matchStage.timestamp.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          matchStage.timestamp.$lte = new Date(filters.endDate);
        }
      }

      // Get statistics using aggregation pipeline
      const statistics = await AuditLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            actionCounts: {
              $push: {
                action: '$action',
                count: 1
              }
            },
            resourceCounts: {
              $push: {
                resource: '$resource',
                count: 1
              }
            },
            uniqueUsers: { $addToSet: '$userId' },
            dateRange: {
              $min: '$timestamp'
            },
            latestActivity: {
              $max: '$timestamp'
            }
          }
        },
        {
          $project: {
            totalLogs: 1,
            uniqueUserCount: { $size: '$uniqueUsers' },
            dateRange: 1,
            latestActivity: 1,
            actions: {
              $reduce: {
                input: '$actionCounts',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [
                        [
                          {
                            k: '$$this.action',
                            v: {
                              $add: [
                                { $ifNull: [{ $getField: { field: '$$this.action', input: '$$value' } }, 0] },
                                1
                              ]
                            }
                          }
                        ]
                      ]
                    }
                  ]
                }
              }
            },
            resources: {
              $reduce: {
                input: '$resourceCounts',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [
                        [
                          {
                            k: '$$this.resource',
                            v: {
                              $add: [
                                { $ifNull: [{ $getField: { field: '$$this.resource', input: '$$value' } }, 0] },
                                1
                              ]
                            }
                          }
                        ]
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ]);

      return statistics[0] || {
        totalLogs: 0,
        uniqueUserCount: 0,
        actions: {},
        resources: {},
        dateRange: null,
        latestActivity: null
      };
    } catch (error) {
      logger.error('Get audit statistics error:', error);
      throw error;
    }
  }

  /**
   * Get available actions for filtering
   * @returns {Array} - List of available actions
   */
  static getAvailableActions() {
    return [
      { value: 'CREATE_USER', label: 'Create User', category: 'User Management' },
      { value: 'UPDATE_USER', label: 'Update User', category: 'User Management' },
      { value: 'DELETE_USER', label: 'Delete User', category: 'User Management' },
      { value: 'CREATE_ROLE', label: 'Create Role', category: 'Role Management' },
      { value: 'UPDATE_ROLE', label: 'Update Role', category: 'Role Management' },
      { value: 'DELETE_ROLE', label: 'Delete Role', category: 'Role Management' },
      { value: 'LOGIN', label: 'Login', category: 'Authentication' },
      { value: 'LOGOUT', label: 'Logout', category: 'Authentication' },
      { value: 'FAILED_LOGIN', label: 'Failed Login', category: 'Authentication' },
      { value: 'CHANGE_PASSWORD', label: 'Change Password', category: 'Authentication' },
      { value: 'RESET_PASSWORD', label: 'Reset Password', category: 'Authentication' },
      { value: 'ASSIGN_ROLE', label: 'Assign Role', category: 'User Management' }
    ];
  }

  /**
   * Get available resources for filtering
   * @returns {Array} - List of available resources
   */
  static getAvailableResources() {
    return [
      { value: 'users', label: 'Users' },
      { value: 'roles', label: 'Roles' },
      { value: 'auth', label: 'Authentication' }
    ];
  }
}

module.exports = AuditService;