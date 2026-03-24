/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : JWT token generation and verification utilities.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a JWT token for a user
 * @param {object} payload - Data to encode (e.g., { userId, email, sessionId })
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
    return token;
  } catch (error) {
    throw new Error(`Error generating token: ${error.message}`);
  }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token from Authorization header
 * @returns {object} - Decoded payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - The Authorization header value (e.g., 'Bearer <token>')
 * @returns {string|null} - Token if found, null otherwise
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader
};