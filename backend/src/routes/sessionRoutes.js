/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Session management routes (protected).
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Logout current session
router.post('/logout', rateLimiter.apiLimiter, sessionController.logout);

// Get all active sessions for the current user
router.get('/', rateLimiter.apiLimiter, sessionController.getActiveSessions);

// Revoke a specific session (including current if different)
router.delete('/:sessionId', rateLimiter.apiLimiter, sessionController.revokeSession);

module.exports = router;