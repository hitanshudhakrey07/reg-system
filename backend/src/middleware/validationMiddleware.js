/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Request validation middleware using custom validators.
 */

const validators = require('../utils/validators');

/**
 * Generic validation error response
 * @param {object} res - Express response object
 * @param {array} errors - Array of error messages
 */
const sendValidationError = (res, errors) => {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    }
  });
};

/**
 * Validate registration OTP request
 * Validates name, email, mobile, age, gender, password
 */
const validateRegistration = (req, res, next) => {
  const errors = [];
  const { name, email, mobile, age, gender, password } = req.body;

  if (!validators.isValidName(name)) {
    errors.push('Name must be 1-100 characters');
  }

  if (!validators.isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!validators.isValidMobile(mobile)) {
    errors.push('Mobile number must be 10-15 digits, optionally starting with +');
  }

  if (!validators.isValidAge(age)) {
    errors.push('Age must be between 18 and 120');
  }

  if (!validators.isValidGender(gender)) {
    errors.push('Gender must be Male, Female, Other, or Prefer not to say');
  }

  if (!validators.isValidPassword(password)) {
    errors.push('Password must be at least 8 characters');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  // Sanitize input
  req.body.name = validators.sanitizeInput(name);
  req.body.email = email.toLowerCase().trim();
  req.body.mobile = mobile.trim();
  req.body.age = parseInt(age, 10);
  req.body.gender = gender;
  req.body.password = password;

  next();
};

/**
 * Validate OTP verification request
 * Validates email and OTP code
 */
const validateOtpVerification = (req, res, next) => {
  const errors = [];
  const { email, otp_code } = req.body;

  if (!validators.isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!validators.isValidOtp(otp_code)) {
    errors.push('OTP must be a 6-digit number');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  req.body.email = email.toLowerCase().trim();
  req.body.otp_code = otp_code;

  next();
};

/**
 * Validate login request
 * Validates email and password (non-empty)
 */
const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!validators.isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password || password.trim() === '') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  req.body.email = email.toLowerCase().trim();
  req.body.password = password;

  next();
};

/**
 * Validate profile update request
 * Validates optional fields: name, mobile, age, gender
 */
const validateProfileUpdate = (req, res, next) => {
  const errors = [];
  const { name, mobile, age, gender } = req.body;

  if (name !== undefined && !validators.isValidName(name)) {
    errors.push('Name must be 1-100 characters');
  }

  if (mobile !== undefined && !validators.isValidMobile(mobile)) {
    errors.push('Mobile number must be 10-15 digits, optionally starting with +');
  }

  if (age !== undefined && !validators.isValidAge(age)) {
    errors.push('Age must be between 18 and 120');
  }

  if (gender !== undefined && !validators.isValidGender(gender)) {
    errors.push('Gender must be Male, Female, Other, or Prefer not to say');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  // Sanitize and convert
  if (name) req.body.name = validators.sanitizeInput(name);
  if (mobile) req.body.mobile = mobile.trim();
  if (age) req.body.age = parseInt(age, 10);
  if (gender) req.body.gender = gender;

  next();
};

/**
 * Validate password change request
 * Validates current and new password
 */
const validatePasswordChange = (req, res, next) => {
  const errors = [];
  const { current_password, new_password } = req.body;

  if (!current_password || current_password.trim() === '') {
    errors.push('Current password is required');
  }

  if (!validators.isValidPassword(new_password)) {
    errors.push('New password must be at least 8 characters');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

/**
 * Validate password reset request (forgot password)
 * Validates email
 */
const validatePasswordResetRequest = (req, res, next) => {
  const errors = [];
  const { email } = req.body;

  if (!validators.isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  req.body.email = email.toLowerCase().trim();

  next();
};

/**
 * Validate password reset verification
 * Validates email, OTP, and new password
 */
const validatePasswordResetVerify = (req, res, next) => {
  const errors = [];
  const { email, otp_code, new_password } = req.body;

  if (!validators.isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!validators.isValidOtp(otp_code)) {
    errors.push('OTP must be a 6-digit number');
  }

  if (!validators.isValidPassword(new_password)) {
    errors.push('New password must be at least 8 characters');
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  req.body.email = email.toLowerCase().trim();
  req.body.otp_code = otp_code;
  req.body.new_password = new_password;

  next();
};

module.exports = {
  validateRegistration,
  validateOtpVerification,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordResetVerify
};