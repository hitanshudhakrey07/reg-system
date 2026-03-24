/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Controller for authentication endpoints.
 */

const authService = require('../services/authService');

/**
 * Extract device information from request headers
 * @param {object} req - Express request object
 * @returns {object} - Device info object
 */
const extractDeviceInfo = (req) => {
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: req.ip || req.connection.remoteAddress || 'unknown'
  };
};

/**
 * Request OTP for registration
 * POST /api/v1/auth/register/request-otp
 */
const requestRegistrationOtp = async (req, res, next) => {
  try {
    const { name, email, mobile, age, gender, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.requestRegistrationOtp(
      { name, email, mobile, age, gender, password },
      ipAddress,
      userAgent
    );

    res.status(200).json(result);
  } catch (error) {
    // Handle specific errors with appropriate status codes
    if (error.message === 'Email already registered' ||
        error.message === 'Mobile number already registered') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: error.message
        }
      });
    }
    next(error);
  }
};

/**
 * Verify OTP and activate account
 * POST /api/v1/auth/register/verify-otp
 */
const verifyRegistrationOtp = async (req, res, next) => {
  try {
    const { email, otp_code } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.verifyRegistrationOtp(email, otp_code, ipAddress, userAgent);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid or expired OTP' ||
        error.message === 'User not found or already verified') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = extractDeviceInfo(req);

    const result = await authService.login(email, password, ipAddress, deviceInfo);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message
        }
      });
    }
    if (error.message === 'Please verify your email before logging in') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: error.message
        }
      });
    }
    if (error.message === 'Account is deactivated. Contact support.') {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: error.message
        }
      });
    }
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const sessionId = req.session.id;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.logout(sessionId, userId, ipAddress, userAgent);

    if (!result) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Session not found or already invalidated'
        }
      });
    }

    res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active sessions for the current user
 * GET /api/v1/auth/sessions
 */
const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessionModel = require('../models/sessionModel');
    const sessions = await sessionModel.getActiveSessionsByUser(userId);

    res.status(200).json({
      sessions: sessions.map(session => ({
        id: session.id,
        device_info: session.device_info,
        ip_address: session.ip_address,
        created_at: session.created_at,
        last_activity: session.last_activity,
        expires_at: session.expires_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a specific session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const sessionModel = require('../models/sessionModel');

    // Ensure user can only revoke their own sessions
    const session = await sessionModel.getActiveSessionByToken(null); // we don't have token; need to fetch by id
    // Better to check if session belongs to user
    const query = `
      SELECT user_id FROM user_sessions WHERE id = $1
    `;
    const db = require('../config/database');
    const result = await db.query(query, [sessionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found'
        }
      });
    }
    if (result.rows[0].user_id !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot revoke another user\'s session'
        }
      });
    }

    const invalidated = await sessionModel.invalidateSession(sessionId);
    if (!invalidated) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Session already invalidated or expired'
        }
      });
    }

    // Audit log
    const auditService = require('../services/auditService');
    await auditService.createAuditLog({
      userId,
      action: 'REVOKE_SESSION',
      tableName: 'user_sessions',
      recordId: sessionId,
      ipAddress,
      userAgent
    });

    res.status(200).json({
      message: 'Session revoked'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset OTP
 * POST /api/v1/auth/password-reset/request
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.requestPasswordReset(email, ipAddress, userAgent);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP
 * POST /api/v1/auth/password-reset/verify
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp_code, new_password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.resetPassword(email, otp_code, new_password, ipAddress, userAgent);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid or expired OTP' ||
        error.message === 'User not found') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    next(error);
  }
};

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  logout,
  getActiveSessions,
  revokeSession,
  requestPasswordReset,
  resetPassword
};