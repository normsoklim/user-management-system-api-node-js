const { query, param } = require('express-validator');

/**
 * Validation schemas for audit endpoints
 */

// Get audit logs query validation
const getAuditLogsQuerySchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  query('action')
    .optional()
    .isIn([
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE',
      'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
      'CHANGE_PASSWORD', 'RESET_PASSWORD',
      'ASSIGN_ROLE'
    ])
    .withMessage('Invalid action'),
  
  query('resource')
    .optional()
    .isIn(['users', 'roles', 'auth'])
    .withMessage('Invalid resource'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && value && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// User ID parameter validation for audit logs
const userIdParamSchema = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Audit log ID parameter validation
const auditLogIdParamSchema = [
  param('id')
    .isMongoId()
    .withMessage('Invalid audit log ID')
];

module.exports = {
  getAuditLogsQuerySchema,
  userIdParamSchema,
  auditLogIdParamSchema
};