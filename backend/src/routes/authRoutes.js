/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Authentication routes (public and protected).
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validationMiddleware = require('../middleware/validationMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post(
  '/register/request-otp',
  rateLimiter.otpLimiter,
  validationMiddleware.validateRegistration,
  authController.requestRegistrationOtp
);

router.post(
  '/register/verify-otp',
  rateLimiter.otpLimiter,
  validationMiddleware.validateOtpVerification,
  authController.verifyRegistrationOtp
);

router.post(
  '/login',
  rateLimiter.loginLimiter,
  validationMiddleware.validateLogin,
  authController.login
);

router.post(
  '/password-reset/request',
  rateLimiter.passwordResetLimiter,
  validationMiddleware.validatePasswordResetRequest,
  authController.requestPasswordReset
);

router.post(
  '/password-reset/verify',
  rateLimiter.passwordResetLimiter,
  validationMiddleware.validatePasswordResetVerify,
  authController.resetPassword
);

// Protected routes (require authentication)
router.post(
  '/logout',
  authMiddleware.authenticate,
  authController.logout
);

router.get(
  '/sessions',
  authMiddleware.authenticate,
  authController.getActiveSessions
);

router.delete(
  '/sessions/:sessionId',
  authMiddleware.authenticate,
  authController.revokeSession
);

module.exports = router;