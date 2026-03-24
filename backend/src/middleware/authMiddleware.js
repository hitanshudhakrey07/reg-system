/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : JWT verification middleware. Extracts token, validates, and attaches user to request.
 */

const jwtUtils = require('../utils/jwt');
const sessionModel = require('../models/sessionModel');
const userModel = require('../models/userModel');

/**
 * Middleware to authenticate requests using JWT.
 * Expects Authorization header: Bearer <token>
 * On success, attaches user and session to req.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing'
        }
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwtUtils.verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: err.message
        }
      });
    }

    const { userId, sessionId, email } = decoded;

    // Validate session exists and is active
    const session = await sessionModel.getActiveSessionByToken(token);
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session expired or invalid'
        }
      });
    }

    // Get user
    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if user is active
    if (user.is_active === false) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account has been deactivated'
        }
      });
    }

    // Update session last activity (async, fire and forget)
    sessionModel.updateLastActivity(session.id).catch(err => {
      console.error('Failed to update session activity:', err.message);
    });

    // Attach to request
    req.user = user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

/**
 * Optional middleware to check if user has admin role.
 * Assumes user object is attached (by authenticate).
 * Add role field to users table and adjust accordingly.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin
};