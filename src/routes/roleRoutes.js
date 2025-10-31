const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const RoleController = require('../controllers/roleController');
const { authenticateToken } = require('../middleware/auth');
const RBAC = require('../utils/rbac');
const AuditLogger = require('../middleware/audit');
const {
  createRoleSchema,
  updateRoleSchema,
  getRolesQuerySchema,
  roleIdParamSchema
} = require('../validators/roleValidator');

const router = express.Router();

// Rate limiting for role management endpoints
const roleManagementLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many role management requests, please try again later'
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
 * @route   GET /api/roles
 * @desc    Get all roles with pagination and filtering
 * @access  Private (requires role:read permission)
 */
router.get('/',
  authenticateToken,
  RBAC.checkPermission('role:read'),
  getRolesQuerySchema,
  handleValidationErrors,
  AuditLogger.auditAction('READ_ROLES', 'roles', { captureAfter: true }),
  RoleController.getRoles
);

/**
 * @route   GET /api/roles/permissions
 * @desc    Get available permissions
 * @access  Private (requires role:read permission)
 */
router.get('/permissions',
  authenticateToken,
  RBAC.checkPermission('role:read'),
  RoleController.getAvailablePermissions
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID
 * @access  Private (requires role:read permission)
 */
router.get('/:id',
  authenticateToken,
  RBAC.checkPermission('role:read'),
  roleIdParamSchema,
  handleValidationErrors,
  AuditLogger.auditAction('READ_ROLE', 'roles', { captureAfter: true }),
  RoleController.getRoleById
);

/**
 * @route   GET /api/roles/:id/users
 * @desc    Get users with a specific role
 * @access  Private (requires role:read permission)
 */
router.get('/:id/users',
  authenticateToken,
  RBAC.checkPermission('role:read'),
  roleIdParamSchema,
  handleValidationErrors,
  RoleController.getRoleUsers
);

/**
 * @route   POST /api/roles
 * @desc    Create a new role
 * @access  Private (requires role:create permission)
 */
router.post('/',
  authenticateToken,
  RBAC.checkPermission('role:create'),
  roleManagementLimit,
  createRoleSchema,
  handleValidationErrors,
  AuditLogger.auditAction('CREATE_ROLE', 'roles', { 
    captureBefore: true, 
    captureAfter: true 
  }),
  RoleController.createRole
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Update role by ID
 * @access  Private (requires role:update permission)
 */
router.put('/:id',
  authenticateToken,
  RBAC.checkPermission('role:update'),
  roleManagementLimit,
  roleIdParamSchema,
  updateRoleSchema,
  handleValidationErrors,
  AuditLogger.auditAction('UPDATE_ROLE', 'roles', { 
    captureBefore: true, 
    captureAfter: true 
  }),
  RoleController.updateRole
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role by ID
 * @access  Private (requires role:delete permission)
 */
router.delete('/:id',
  authenticateToken,
  RBAC.checkPermission('role:delete'),
  roleManagementLimit,
  roleIdParamSchema,
  handleValidationErrors,
  AuditLogger.auditAction('DELETE_ROLE', 'roles', { 
    captureBefore: true 
  }),
  RoleController.deleteRole
);

module.exports = router;