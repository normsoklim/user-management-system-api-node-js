const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const RBAC = require('../utils/rbac');
const AuditLogger = require('../middleware/audit');
const { handleAvatarUpload } = require('../middleware/upload');
const {
  validate,
  validateQuery,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  getUsersQuerySchema
} = require('../validators/userValidator');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all users - requires user:read permission
router.get('/',
  RBAC.checkPermission('user:read'),
  validateQuery(getUsersQuerySchema),
  AuditLogger.auditAction('READ_USERS', 'users', { captureAfter: true }),
  UserController.getUsers
);

// Get user by ID - requires user:read permission
router.get('/:id',
  RBAC.checkPermission('user:read'),
  AuditLogger.auditAction('READ_USER', 'users', { captureAfter: true }),
  UserController.getUserById
);

// Create user - requires user:create permission
router.post('/',
  RBAC.checkPermission('user:create'),
  handleAvatarUpload,
  validate(createUserSchema),
  AuditLogger.auditAction('CREATE_USER', 'users', { captureAfter: true }),
  UserController.createUser
);

// Update user - requires user:update permission
router.put('/:id',
  RBAC.checkPermission('user:update'),
  handleAvatarUpload,
  validate(updateUserSchema),
  AuditLogger.auditAction('UPDATE_USER', 'users', { captureAfter: true }),
  UserController.updateUser
);

// Delete user - requires user:delete permission
router.delete('/:id', 
  RBAC.checkPermission('user:delete'),
  AuditLogger.auditAction('DELETE_USER', 'users'),
  UserController.deleteUser
);

// Update own profile - requires user:update:self permission
router.put('/profile',
  RBAC.checkSelfPermission('user:update'),
  handleAvatarUpload,
  validate(updateProfileSchema),
  AuditLogger.auditAction('UPDATE_USER', 'users', { captureAfter: true }),
  UserController.updateProfile
);

// Get audit logs for a specific user - requires audit:read permission
router.get('/:id/audit-logs', 
  RBAC.checkPermission('audit:read'),
  UserController.getUserAuditLogs
);

module.exports = router;