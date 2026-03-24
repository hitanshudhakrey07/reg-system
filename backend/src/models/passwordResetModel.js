/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for password_resets table.
 */

const db = require('../config/database');

/**
 * Create a password reset token
 * @param {object} resetData - { email, token, expiresAt }
 * @returns {Promise<object>} - Created reset record
 */
const createPasswordReset = async (resetData) => {
  const { email, token, expiresAt } = resetData;
  const query = `
    INSERT INTO password_resets (email, token, expires_at, is_used)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, token, expires_at, is_used, created_at
  `;
  const values = [email, token, expiresAt, false];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get valid (not expired, not used) password reset token
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @returns {Promise<object|null>} - Reset record if valid, else null
 */
const getValidResetToken = async (email, token) => {
  const query = `
    SELECT id, email, token, expires_at, is_used, created_at
    FROM password_resets
    WHERE email = $1
      AND token = $2
      AND is_used = false
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await db.query(query, [email, token]);
  return result.rows[0] || null;
};

/**
 * Mark password reset token as used
 * @param {number} resetId - Password reset record ID
 * @returns {Promise<boolean>} - Success status
 */
const markResetTokenAsUsed = async (resetId) => {
  const query = `
    UPDATE password_resets
    SET is_used = true
    WHERE id = $1 AND is_used = false
    RETURNING id
  `;
  const result = await db.query(query, [resetId]);
  return result.rowCount > 0;
};

/**
 * Invalidate all pending password reset tokens for an email
 * @param {string} email - User email
 * @returns {Promise<number>} - Number of records invalidated
 */
const invalidateOldResetTokens = async (email) => {
  const query = `
    UPDATE password_resets
    SET is_used = true
    WHERE email = $1 AND is_used = false
    RETURNING id
  `;
  const result = await db.query(query, [email]);
  return result.rowCount;
};

/**
 * Delete expired password reset tokens (cleanup)
 * @returns {Promise<number>} - Number of records deleted
 */
const deleteExpiredTokens = async () => {
  const query = `
    DELETE FROM password_resets
    WHERE expires_at < CURRENT_TIMESTAMP OR is_used = true
    RETURNING id
  `;
  const result = await db.query(query);
  return result.rowCount;
};

module.exports = {
  createPasswordReset,
  getValidResetToken,
  markResetTokenAsUsed,
  invalidateOldResetTokens,
  deleteExpiredTokens
};