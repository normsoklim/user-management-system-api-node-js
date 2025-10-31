const { body, param, query } = require('express-validator');

/**
 * Validation schemas for role endpoints
 */

// Create role validation
const createRoleSchema = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Role name can only contain letters, numbers, underscores, and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions must be an array with at least one permission')
    .custom((permissions) => {
      const validPermissions = [
        'user:create', 'user:read', 'user:update', 'user:delete',
        'user:read:self', 'user:update:self',
        'role:create', 'role:read', 'role:update', 'role:delete',
        'audit:read', 'audit:read:self',
        '*:*' // Super admin permission
      ];
      
      for (const permission of permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
      return true;
    })
];

// Update role validation
const updateRoleSchema = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Role name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Role name can only contain letters, numbers, underscores, and hyphens'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  
  body('permissions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Permissions must be an array with at least one permission')
    .custom((permissions) => {
      const validPermissions = [
        'user:create', 'user:read', 'user:update', 'user:delete',
        'user:read:self', 'user:update:self',
        'role:create', 'role:read', 'role:update', 'role:delete',
        'audit:read', 'audit:read:self',
        '*:*' // Super admin permission
      ];
      
      for (const permission of permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
      return true;
    })
];

// Get roles query validation
const getRolesQuerySchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
    
  query('sortBy')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('sortBy must be a non-empty string')
    .default('createdAt'),
    
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sort must be either "asc" or "desc"')
    .default('desc')
];

// Role ID parameter validation
const roleIdParamSchema = [
  param('id')
    .isMongoId()
    .withMessage('Invalid role ID')
];

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  getRolesQuerySchema,
  roleIdParamSchema
};