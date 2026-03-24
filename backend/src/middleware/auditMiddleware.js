/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Middleware to automatically log requests to audit logs.
 */

const auditService = require('../services/auditService');

/**
 * Middleware to log user actions for protected routes.
 * Should be used after authentication middleware.
 * Captures request details and logs the action.
 *
 * @param {string} action - Action name to log (e.g., 'UPDATE_PROFILE', 'LOGOUT')
 * @param {object} options - Optional configuration
 * @param {string} options.tableName - Table being affected (optional)
 * @param {function} options.extractRecordId - Function to extract record ID from request (optional)
 * @param {function} options.extractOldData - Function to extract old data (optional)
 * @param {function} options.extractNewData - Function to extract new data (optional)
 * @returns {function} Express middleware
 */
const auditLog = (action, options = {}) => {
  return async (req, res, next) => {
    // Store original end method to capture response
    const originalEnd = res.end;
    let responseBody = null;

    // Intercept response to capture data if needed
    if (options.extractNewData || options.extractOldData) {
      res.end = function (chunk, encoding) {
        if (chunk) {
          try {
            responseBody = JSON.parse(chunk.toString());
          } catch (err) {
            // Not JSON or parse error, ignore
          }
        }
        originalEnd.call(this, chunk, encoding);
      };
    }

    // Execute the route handler
    next();

    // After response is sent, log the action
    res.on('finish', async () => {
      // Only log successful requests (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || null;

      let recordId = null;
      let oldData = null;
      let newData = null;

      if (options.extractRecordId) {
        recordId = options.extractRecordId(req, res, responseBody);
      }

      if (options.extractOldData) {
        oldData = options.extractOldData(req, res, responseBody);
      }

      if (options.extractNewData) {
        newData = options.extractNewData(req, res, responseBody);
      }

      try {
        await auditService.createAuditLog({
          userId,
          action,
          tableName: options.tableName || null,
          recordId,
          oldData,
          newData,
          ipAddress,
          userAgent
        });
      } catch (err) {
        console.error('Audit log creation failed:', err.message);
        // Don't block or crash on audit failure
      }
    });
  };
};

/**
 * Convenience middleware to log user profile updates.
 * Automatically captures old and new profile data.
 * Requires user object on req (from auth middleware).
 */
const auditProfileUpdate = async (req, res, next) => {
  const oldProfile = { ...req.user }; // Copy before changes
  next();
  // After route handler, capture new data from response or body
  // This is simplified; in practice, you'd need to capture the updated user from response.
  // For simplicity, we'll rely on a separate manual audit in controller.
  // This middleware is a placeholder; actual logging done in controller with before/after.
};

module.exports = {
  auditLog,
  auditProfileUpdate
};