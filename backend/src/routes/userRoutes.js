/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : User profile routes (protected).
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validationMiddleware = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get current user profile
router.get('/me', userController.getCurrentUser);

// Update current user profile
router.put(
  '/me',
  rateLimiter.apiLimiter,
  validationMiddleware.validateProfileUpdate,
  userController.updateProfile
);

// Change password
router.post(
  '/me/change-password',
  rateLimiter.apiLimiter,
  validationMiddleware.validatePasswordChange,
  userController.changePassword
);

module.exports = router;