const express = require('express');
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const AuditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const RBAC = require('../utils/rbac');
const {
  getAuditLogsQuerySchema,
  userIdParamSchema,
  auditLogIdParamSchema
} = require('../validators/auditValidator');

const router = express.Router();

// Rate limiting for audit endpoints
const auditLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many audit requests, please try again later'
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * @route   GET /api/audit/logs
 * @desc    Get all audit logs with pagination and filtering
 * @access  Private (requires audit:read permission)
 */
router.get('/logs',
  authenticateToken,
  RBAC.checkPermission('audit:read'),
  auditLimit,
  getAuditLogsQuerySchema,
  handleValidationErrors,
  AuditController.getAuditLogs
);

/**
 * @route   GET /api/audit/logs/my
 * @desc    Get current user's audit logs
 * @access  Private (requires audit:read:self permission)
 */
router.get('/logs/my',
  authenticateToken,
  RBAC.checkPermission('audit:read:self'),
  auditLimit,
  getAuditLogsQuerySchema,
  handleValidationErrors,
  AuditController.getMyAuditLogs
);

/**
 * @route   GET /api/audit/logs/:id
 * @desc    Get audit log by ID
 * @access  Private (requires audit:read permission)
 */
router.get('/logs/:id',
  authenticateToken,
  RBAC.checkPermission('audit:read'),
  auditLogIdParamSchema,
  handleValidationErrors,
  AuditController.getAuditLogById
);

/**
 * @route   GET /api/audit/users/:userId/logs
 * @desc    Get audit logs for a specific user
 * @access  Private (requires audit:read permission for other users, audit:read:self for own logs)
 */
router.get('/users/:userId/logs',
  authenticateToken,
  // Permission check is done in the controller based on user context
  auditLimit,
  userIdParamSchema,
  handleValidationErrors,
  getAuditLogsQuerySchema,
  handleValidationErrors,
  AuditController.getUserAuditLogs
);

/**
 * @route   GET /api/audit/statistics
 * @desc    Get audit statistics
 * @access  Private (requires audit:read permission)
 */
router.get('/statistics',
  authenticateToken,
  RBAC.checkPermission('audit:read'),
  auditLimit,
  AuditController.getAuditStatistics
);

/**
 * @route   GET /api/audit/actions
 * @desc    Get available actions for filtering
 * @access  Private (requires audit:read permission)
 */
router.get('/actions',
  authenticateToken,
  RBAC.checkPermission('audit:read'),
  AuditController.getAvailableActions
);

/**
 * @route   GET /api/audit/resources
 * @desc    Get available resources for filtering
 * @access  Private (requires audit:read permission)
 */
router.get('/resources',
  authenticateToken,
  RBAC.checkPermission('audit:read'),
  AuditController.getAvailableResources
);

module.exports = router;