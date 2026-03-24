/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Service for generating, storing, and validating OTP codes.
 */

const crypto = require('crypto');
const config = require('../config/env');
const otpModel = require('../models/otpModel');

/**
 * Generate a random 6-digit numeric OTP
 * @returns {string} - 6-digit OTP code
 */
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Calculate expiry timestamp based on current time and configured expiry minutes
 * @returns {Date} - Expiry timestamp
 */
const getOtpExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + config.otp.expiryMinutes);
  return expiry;
};

/**
 * Create and store a new OTP for a given email and type
 * @param {string} email - User email
 * @param {string} type - 'registration' or 'password_reset'
 * @returns {Promise<{otpCode: string, record: object}>} - Generated OTP and created record
 */
const createOtpForEmail = async (email, type) => {
  // Invalidate any existing pending OTPs for this email and type
  await otpModel.invalidateOldOtps(email, type);

  const otpCode = generateOtpCode();
  const expiresAt = getOtpExpiry();

  const record = await otpModel.createOtp({
    email,
    otpCode,
    type,
    expiresAt
  });

  return { otpCode, record };
};

/**
 * Validate an OTP for a specific email and type
 * @param {string} email - User email
 * @param {string} type - 'registration' or 'password_reset'
 * @param {string} otpCode - OTP to validate
 * @returns {Promise<object>} - { valid: boolean, otpId?: number, error?: string }
 */
const validateOtp = async (email, type, otpCode) => {
  // Retrieve valid OTP record
  const otpRecord = await otpModel.getValidOtp(email, type, otpCode);

  if (!otpRecord) {
    return {
      valid: false,
      error: 'Invalid or expired OTP'
    };
  }

  // Mark as used
  const marked = await otpModel.markOtpAsUsed(otpRecord.id);
  if (!marked) {
    return {
      valid: false,
      error: 'OTP already used'
    };
  }

  return {
    valid: true,
    otpId: otpRecord.id
  };
};

module.exports = {
  generateOtpCode,
  getOtpExpiry,
  createOtpForEmail,
  validateOtp
};