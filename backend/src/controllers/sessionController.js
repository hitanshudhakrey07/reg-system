/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Controller for session management endpoints.
 */

const sessionModel = require('../models/sessionModel');
const auditService = require('../services/auditService');

/**
 * Logout current session
 * POST /api/v1/sessions/logout
 */
const logout = async (req, res, next) => {
  try {
    const sessionId = req.session.id;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const invalidated = await sessionModel.invalidateSession(sessionId);
    if (!invalidated) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Session not found or already invalidated'
        }
      });
    }

    await auditService.createAuditLog({
      userId,
      action: 'LOGOUT',
      tableName: 'user_sessions',
      recordId: sessionId,
      ipAddress,
      userAgent
    });

    res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active sessions for the current user
 * GET /api/v1/sessions
 */
const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
 * DELETE /api/v1/sessions/:sessionId
 */
const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Verify session belongs to the current user
    const db = require('../config/database');
    const query = `SELECT user_id FROM user_sessions WHERE id = $1`;
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

module.exports = {
  logout,
  getActiveSessions,
  revokeSession
};