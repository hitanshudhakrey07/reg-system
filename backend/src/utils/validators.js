/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Custom validation functions for request data.
 */

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid email format
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate mobile number (10-15 digits, optional + prefix)
 * @param {string} mobile - Mobile number
 * @returns {boolean} - True if valid mobile format
 */
const isValidMobile = (mobile) => {
  if (!mobile) return false;
  const mobileRegex = /^\+?[0-9]{10,15}$/;
  return mobileRegex.test(mobile);
};

/**
 * Validate age (18-120)
 * @param {number} age - Age in years
 * @returns {boolean} - True if age is within allowed range
 */
const isValidAge = (age) => {
  if (age === undefined || age === null) return false;
  const num = parseInt(age, 10);
  return !isNaN(num) && num >= 18 && num <= 120;
};

/**
 * Validate gender value
 * @param {string} gender - Gender string
 * @returns {boolean} - True if gender is one of allowed values
 */
const isValidGender = (gender) => {
  if (!gender) return false;
  const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  return allowedGenders.includes(gender);
};

/**
 * Validate password strength (min 8 characters)
 * @param {string} password - Password
 * @returns {boolean} - True if password meets minimum length
 */
const isValidPassword = (password) => {
  if (!password) return false;
  return password.length >= 8;
};

/**
 * Validate OTP format (6-digit numeric)
 * @param {string} otp - OTP code
 * @returns {boolean} - True if OTP is exactly 6 digits
 */
const isValidOtp = (otp) => {
  if (!otp) return false;
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

/**
 * Validate name (non-empty, max 100 characters)
 * @param {string} name - User's full name
 * @returns {boolean} - True if name is valid
 */
const isValidName = (name) => {
  if (!name) return false;
  return name.length >= 1 && name.length <= 100;
};

/**
 * Sanitize input to prevent XSS (simple version)
 * @param {string} input - Raw input string
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
  if (!input) return '';
  return input.replace(/[&<>]/g, (char) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    };
    return escapeMap[char] || char;
  });
};

module.exports = {
  isValidEmail,
  isValidMobile,
  isValidAge,
  isValidGender,
  isValidPassword,
  isValidOtp,
  isValidName,
  sanitizeInput
};