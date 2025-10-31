const AuditService = require('../services/auditService');
const logger = require('../utils/logger');

class AuditController {
  /**
   * Get all audit logs
   */
  static async getAuditLogs(req, res) {
    try {
      const { page, limit, userId, action, resource, startDate, endDate } = req.query;
      
      const filters = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (resource) filters.resource = resource;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await AuditService.getAuditLogs(
        filters,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get audit logs controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get audit log by ID
   */
  static async getAuditLogById(req, res) {
    try {
      const { id } = req.params;
      
      const auditLog = await AuditService.getAuditLogById(id);
      
      res.json({
        success: true,
        message: 'Audit log retrieved successfully',
        data: auditLog
      });
    } catch (error) {
      logger.error('Get audit log by ID controller error:', error);
      
      if (error.message === 'Audit log not found') {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(req, res) {
    try {
      const { userId } = req.params;
      const { page, limit, action, resource, startDate, endDate } = req.query;
      
      // Check if user has permission to view these logs
      if (req.user.userId !== userId && !req.user.permissions.includes('audit:read')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view these audit logs'
        });
      }
      
      const filters = {};
      if (action) filters.action = action;
      if (resource) filters.resource = resource;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await AuditService.getUserAuditLogs(
        userId,
        filters,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        message: 'User audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get user audit logs controller error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get current user's audit logs
   */
  static async getMyAuditLogs(req, res) {
    try {
      const { page, limit, action, resource, startDate, endDate } = req.query;
      
      const filters = {};
      if (action) filters.action = action;
      if (resource) filters.resource = resource;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result = await AuditService.getUserAuditLogs(
        req.user.userId,
        filters,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        message: 'Your audit logs retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get my audit logs controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve your audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(req, res) {
    try {
      const { userId, startDate, endDate } = req.query;
      
      // Check if user has permission to view statistics
      if (userId && req.user.userId !== userId && !req.user.permissions.includes('audit:read')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view these statistics'
        });
      }
      
      const filters = {};
      if (userId) filters.userId = userId;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const statistics = await AuditService.getAuditStatistics(filters);

      res.json({
        success: true,
        message: 'Audit statistics retrieved successfully',
        data: statistics
      });
    } catch (error) {
      logger.error('Get audit statistics controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available actions for filtering
   */
  static async getAvailableActions(req, res) {
    try {
      const actions = AuditService.getAvailableActions();

      res.json({
        success: true,
        message: 'Available actions retrieved successfully',
        data: actions
      });
    } catch (error) {
      logger.error('Get available actions controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available actions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Get available resources for filtering
   */
  static async getAvailableResources(req, res) {
    try {
      const resources = AuditService.getAvailableResources();

      res.json({
        success: true,
        message: 'Available resources retrieved successfully',
        data: resources
      });
    } catch (error) {
      logger.error('Get available resources controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve available resources',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = AuditController;