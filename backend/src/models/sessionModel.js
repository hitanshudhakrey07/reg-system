/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for user_sessions table.
 */

const db = require('../config/database');

/**
 * Create a new user session
 * @param {object} sessionData - { userId, token, deviceInfo, ipAddress, expiresAt }
 * @returns {Promise<object>} - Created session record
 */
const createSession = async (sessionData) => {
  const { userId, token, deviceInfo, ipAddress, expiresAt } = sessionData;
  const query = `
    INSERT INTO user_sessions (user_id, token, device_info, ip_address, expires_at, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, token, device_info, ip_address, expires_at, is_active, created_at, last_activity
  `;
  const values = [userId, token, JSON.stringify(deviceInfo), ipAddress, expiresAt, true];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get active session by token
 * @param {string} token - Session token (JWT)
 * @returns {Promise<object|null>} - Session record if active and not expired
 */
const getActiveSessionByToken = async (token) => {
  const query = `
    SELECT id, user_id, token, device_info, ip_address, expires_at, is_active, created_at, last_activity
    FROM user_sessions
    WHERE token = $1
      AND is_active = true
      AND expires_at > CURRENT_TIMESTAMP
  `;
  const result = await db.query(query, [token]);
  return result.rows[0] || null;
};

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} - Array of active session records
 */
const getActiveSessionsByUser = async (userId) => {
  const query = `
    SELECT id, token, device_info, ip_address, expires_at, created_at, last_activity
    FROM user_sessions
    WHERE user_id = $1
      AND is_active = true
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
  `;
  const result = await db.query(query, [userId]);
  return result.rows;
};

/**
 * Invalidate a session (log out)
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} - Success status
 */
const invalidateSession = async (sessionId) => {
  const query = `
    UPDATE user_sessions
    SET is_active = false
    WHERE id = $1 AND is_active = true
    RETURNING id
  `;
  const result = await db.query(query, [sessionId]);
  return result.rowCount > 0;
};

/**
 * Invalidate all sessions for a user (except possibly one)
 * @param {string} userId - User ID
 * @param {string|null} excludeSessionId - Optional session ID to keep active
 * @returns {Promise<number>} - Number of sessions invalidated
 */
const invalidateAllUserSessions = async (userId, excludeSessionId = null) => {
  let query = `
    UPDATE user_sessions
    SET is_active = false
    WHERE user_id = $1 AND is_active = true
  `;
  const values = [userId];
  if (excludeSessionId) {
    query += ` AND id != $2`;
    values.push(excludeSessionId);
  }
  query += ` RETURNING id`;
  const result = await db.query(query, values);
  return result.rowCount;
};

/**
 * Update last activity timestamp for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} - Success status
 */
const updateLastActivity = async (sessionId) => {
  const query = `
    UPDATE user_sessions
    SET last_activity = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;
  const result = await db.query(query, [sessionId]);
  return result.rowCount > 0;
};

/**
 * Delete expired sessions (cleanup)
 * @returns {Promise<number>} - Number of deleted sessions
 */
const deleteExpiredSessions = async () => {
  const query = `
    DELETE FROM user_sessions
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false
    RETURNING id
  `;
  const result = await db.query(query);
  return result.rowCount;
};

module.exports = {
  createSession,
  getActiveSessionByToken,
  getActiveSessionsByUser,
  invalidateSession,
  invalidateAllUserSessions,
  updateLastActivity,
  deleteExpiredSessions
};