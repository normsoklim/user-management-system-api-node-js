const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('../validators/authValidator');

// Public routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/change-password', authenticateToken, validate(changePasswordSchema), AuthController.changePassword);
router.get('/profile', authenticateToken, AuthController.getProfile);

module.exports = router;