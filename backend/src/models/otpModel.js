/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for otp_verifications table.
 */

const db = require('../config/database');

/**
 * Create a new OTP record
 * @param {object} otpData - { email, otpCode, type, expiresAt }
 * @returns {Promise<object>} - Created OTP record
 */
const createOtp = async (otpData) => {
  const { email, otpCode, type, expiresAt } = otpData;
  const query = `
    INSERT INTO otp_verifications (email, otp_code, type, expires_at, is_used)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, type, expires_at, is_used, created_at
  `;
  const values = [email, otpCode, type, expiresAt, false];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get valid (not expired, not used) OTP by email, type, and code
 * @param {string} email - User email
 * @param {string} type - OTP type ('registration', 'password_reset')
 * @param {string} otpCode - OTP code
 * @returns {Promise<object|null>} - OTP record if valid, else null
 */
const getValidOtp = async (email, type, otpCode) => {
  const query = `
    SELECT id, email, otp_code, type, expires_at, is_used, created_at
    FROM otp_verifications
    WHERE email = $1
      AND type = $2
      AND otp_code = $3
      AND is_used = false
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await db.query(query, [email, type, otpCode]);
  return result.rows[0] || null;
};

/**
 * Mark an OTP as used
 * @param {number} otpId - OTP record ID
 * @returns {Promise<boolean>} - Success status
 */
const markOtpAsUsed = async (otpId) => {
  const query = `
    UPDATE otp_verifications
    SET is_used = true
    WHERE id = $1 AND is_used = false
    RETURNING id
  `;
  const result = await db.query(query, [otpId]);
  return result.rowCount > 0;
};

/**
 * Invalidate all pending OTPs for an email and type (optional)
 * @param {string} email - User email
 * @param {string} type - OTP type
 * @returns {Promise<number>} - Number of records invalidated
 */
const invalidateOldOtps = async (email, type) => {
  const query = `
    UPDATE otp_verifications
    SET is_used = true
    WHERE email = $1 AND type = $2 AND is_used = false
    RETURNING id
  `;
  const result = await db.query(query, [email, type]);
  return result.rowCount;
};

/**
 * Delete expired OTPs (optional cleanup)
 * @returns {Promise<number>} - Number of records deleted
 */
const deleteExpiredOtps = async () => {
  const query = `
    DELETE FROM otp_verifications
    WHERE expires_at < CURRENT_TIMESTAMP
    RETURNING id
  `;
  const result = await db.query(query);
  return result.rowCount;
};

module.exports = {
  createOtp,
  getValidOtp,
  markOtpAsUsed,
  invalidateOldOtps,
  deleteExpiredOtps
};