/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for users table.
 */

const db = require('../config/database');

/**
 * Create a new user (pending verification)
 * @param {object} userData - { name, email, mobile, age, gender, passwordHash, username }
 * @returns {Promise<object>} - Created user record
 */
const createPendingUser = async (userData) => {
  const { name, email, mobile, age, gender, passwordHash, username } = userData;
  const query = `
    INSERT INTO users (name, email, mobile, age, gender, password_hash, username, is_verified)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name, email, username, is_verified, created_at
  `;
  const values = [name, email, mobile, age, gender, passwordHash, username, false];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get user by email (full record)
 * @param {string} email - User email
 * @returns {Promise<object|null>} - User record or null
 */
const getUserByEmail = async (email) => {
  const query = `
    SELECT id, name, email, mobile, age, gender, username, password_hash, is_verified, 
           is_active, created_at, updated_at, last_login
    FROM users
    WHERE email = $1
  `;
  const result = await db.query(query, [email]);
  return result.rows[0] || null;
};

/**
 * Get user by username (full record)
 * @param {string} username - User username
 * @returns {Promise<object|null>} - User record or null
 */
const getUserByUsername = async (username) => {
  const query = `
    SELECT id, name, email, mobile, age, gender, username, password_hash, is_verified, 
           is_active, created_at, updated_at, last_login
    FROM users
    WHERE username = $1
  `;
  const result = await db.query(query, [username]);
  return result.rows[0] || null;
};

/**
 * Get user by ID (public profile data)
 * @param {string} userId - UUID of user
 * @returns {Promise<object|null>} - User record (excluding sensitive fields) or null
 */
const getUserById = async (userId) => {
  const query = `
    SELECT id, name, email, mobile, age, gender, username, is_verified, 
           is_active, created_at, updated_at, last_login
    FROM users
    WHERE id = $1
  `;
  const result = await db.query(query, [userId]);
  return result.rows[0] || null;
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update (name, mobile, age, gender)
 * @returns {Promise<object|null>} - Updated user record
 */
const updateUserProfile = async (userId, updates) => {
  const allowedFields = ['name', 'mobile', 'age', 'gender'];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(updates[field]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const query = `
    UPDATE users
    SET ${setClauses.join(', ')}
    WHERE id = $${idx}
    RETURNING id, name, email, mobile, age, gender, username, is_verified, is_active, created_at, updated_at, last_login
  `;
  const result = await db.query(query, values);
  return result.rows[0] || null;
};

/**
 * Update user password hash
 * @param {string} userId - User ID
 * @param {string} newPasswordHash - New bcrypt hash
 * @returns {Promise<boolean>} - Success status
 */
const updatePassword = async (userId, newPasswordHash) => {
  const query = `
    UPDATE users
    SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id
  `;
  const result = await db.query(query, [newPasswordHash, userId]);
  return result.rowCount > 0;
};

/**
 * Mark user as verified
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Success status
 */
const verifyUser = async (email) => {
  const query = `
    UPDATE users
    SET is_verified = true, updated_at = CURRENT_TIMESTAMP
    WHERE email = $1 AND is_verified = false
    RETURNING id
  `;
  const result = await db.query(query, [email]);
  return result.rowCount > 0;
};

/**
 * Update last login timestamp
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const updateLastLogin = async (userId) => {
  const query = `
    UPDATE users
    SET last_login = CURRENT_TIMESTAMP
    WHERE id = $1
  `;
  await db.query(query, [userId]);
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - True if exists
 */
const emailExists = async (email) => {
  const query = `SELECT id FROM users WHERE email = $1`;
  const result = await db.query(query, [email]);
  return result.rowCount > 0;
};

/**
 * Check if mobile exists
 * @param {string} mobile - Mobile number to check
 * @returns {Promise<boolean>} - True if exists
 */
const mobileExists = async (mobile) => {
  const query = `SELECT id FROM users WHERE mobile = $1`;
  const result = await db.query(query, [mobile]);
  return result.rowCount > 0;
};

module.exports = {
  createPendingUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  updateUserProfile,
  updatePassword,
  verifyUser,
  updateLastLogin,
  emailExists,
  mobileExists
};