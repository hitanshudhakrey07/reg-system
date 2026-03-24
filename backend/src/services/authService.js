/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Core authentication business logic (registration, login, OTP verification, password reset).
 */

const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const usernameGenerator = require('../utils/usernameGenerator');
const userModel = require('../models/userModel');
const otpService = require('./otpService');
const emailService = require('./emailService');
const sessionModel = require('../models/sessionModel');
const auditService = require('./auditService');

/**
 * Request OTP for registration - validates data, creates pending user, sends OTP
 * @param {object} userData - { name, email, mobile, age, gender, password }
 * @param {string} ipAddress - Request IP for audit
 * @param {object} userAgent - User agent info
 * @returns {Promise<object>} - { success: boolean, message?: string, error?: string }
 */
const requestRegistrationOtp = async (userData, ipAddress, userAgent) => {
  const { name, email, mobile, age, gender, password } = userData;

  // Check if email already exists
  const existingEmail = await userModel.emailExists(email);
  if (existingEmail) {
    throw new Error('Email already registered');
  }

  // Check if mobile already exists
  const existingMobile = await userModel.mobileExists(mobile);
  if (existingMobile) {
    throw new Error('Mobile number already registered');
  }

  // Hash password
  const passwordHash = await bcryptUtils.hashPassword(password);

  // Generate username
  const username = await usernameGenerator.generateUniqueUsername(name, email);

  // Create pending user
  const user = await userModel.createPendingUser({
    name,
    email,
    mobile,
    age,
    gender,
    passwordHash,
    username
  });

  // Generate and send OTP
  const { otpCode } = await otpService.createOtpForEmail(email, 'registration');
  await emailService.sendOtpEmail(email, otpCode, 'registration');

  // Audit log
  await auditService.createAuditLog({
    userId: user.id,
    action: 'REGISTRATION_OTP_REQUEST',
    tableName: 'users',
    recordId: user.id,
    newData: { email, name },
    ipAddress,
    userAgent
  });

  return {
    success: true,
    message: 'OTP sent to email',
    email
  };
};

/**
 * Verify OTP and activate user account
 * @param {string} email - User email
 * @param {string} otpCode - OTP code
 * @param {string} ipAddress - Request IP
 * @param {object} userAgent - User agent info
 * @returns {Promise<object>} - { success: boolean, user?: object, message?: string, error?: string }
 */
const verifyRegistrationOtp = async (email, otpCode, ipAddress, userAgent) => {
  // Validate OTP
  const validation = await otpService.validateOtp(email, 'registration', otpCode);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid OTP');
  }

  // Mark user as verified
  const verified = await userModel.verifyUser(email);
  if (!verified) {
    throw new Error('User not found or already verified');
  }

  // Get user details
  const user = await userModel.getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  // Send welcome email (non-blocking, fire and forget)
  emailService.sendWelcomeEmail(email, user.name).catch(err => {
    console.error('Welcome email sending failed:', err.message);
  });

  // Audit log
  await auditService.createAuditLog({
    userId: user.id,
    action: 'REGISTRATION_VERIFY',
    tableName: 'users',
    recordId: user.id,
    newData: { is_verified: true },
    ipAddress,
    userAgent
  });

  return {
    success: true,
    message: 'Account verified successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      is_verified: user.is_verified
    }
  };
};

/**
 * Login user - validates credentials, creates session, returns token
 * @param {string} email - User email
 * @param {string} password - Plain password
 * @param {string} ipAddress - Request IP
 * @param {object} deviceInfo - Device information
 * @returns {Promise<object>} - { token, user, session }
 */
const login = async (email, password, ipAddress, deviceInfo) => {
  // Get user by email
  const user = await userModel.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if user is verified
  if (!user.is_verified) {
    throw new Error('Please verify your email before logging in');
  }

  // Check if user is active
  if (user.is_active === false) {
    throw new Error('Account is deactivated. Contact support.');
  }

  // Verify password
  const isPasswordValid = await bcryptUtils.comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await userModel.updateLastLogin(user.id);

  // Create session
  const sessionExpiry = new Date();
  sessionExpiry.setDate(sessionExpiry.getDate() + 7); // 7 days

  const token = jwtUtils.generateToken({
    userId: user.id,
    email: user.email,
    sessionId: null // Will be set after session creation
  });

  // Create session record
  const session = await sessionModel.createSession({
    userId: user.id,
    token,
    deviceInfo,
    ipAddress,
    expiresAt: sessionExpiry
  });

  // Regenerate token with sessionId included
  const finalToken = jwtUtils.generateToken({
    userId: user.id,
    email: user.email,
    sessionId: session.id
  });

  // Update session with final token
  await sessionModel.invalidateSession(session.id); // invalidate the old one
  await sessionModel.createSession({
    userId: user.id,
    token: finalToken,
    deviceInfo,
    ipAddress,
    expiresAt: sessionExpiry
  });

  // Audit log
  await auditService.createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    tableName: 'users',
    recordId: user.id,
    ipAddress,
    userAgent: deviceInfo?.userAgent || null
  });

  return {
    token: finalToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username
    },
    session: {
      id: session.id,
      expires_at: sessionExpiry
    }
  };
};

/**
 * Logout - invalidate session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID (for audit)
 * @param {string} ipAddress - Request IP
 * @param {object} userAgent - User agent info
 * @returns {Promise<boolean>}
 */
const logout = async (sessionId, userId, ipAddress, userAgent) => {
  const invalidated = await sessionModel.invalidateSession(sessionId);
  if (invalidated) {
    await auditService.createAuditLog({
      userId,
      action: 'LOGOUT',
      tableName: 'user_sessions',
      recordId: sessionId,
      ipAddress,
      userAgent
    });
  }
  return invalidated;
};

/**
 * Request password reset OTP
 * @param {string} email - User email
 * @param {string} ipAddress - Request IP
 * @param {object} userAgent - User agent info
 * @returns {Promise<object>} - { success: boolean, message: string }
 */
const requestPasswordReset = async (email, ipAddress, userAgent) => {
  // Check if user exists and is verified (but don't reveal existence)
  const user = await userModel.getUserByEmail(email);
  if (!user || !user.is_verified) {
    // Return generic success to prevent user enumeration
    return {
      success: true,
      message: 'If account exists and is verified, a reset OTP has been sent'
    };
  }

  // Generate and send OTP
  const { otpCode } = await otpService.createOtpForEmail(email, 'password_reset');
  await emailService.sendOtpEmail(email, otpCode, 'password_reset');

  // Audit log
  await auditService.createAuditLog({
    userId: user.id,
    action: 'PASSWORD_RESET_REQUEST',
    tableName: 'users',
    recordId: user.id,
    ipAddress,
    userAgent
  });

  return {
    success: true,
    message: 'If account exists and is verified, a reset OTP has been sent'
  };
};

/**
 * Reset password using OTP
 * @param {string} email - User email
 * @param {string} otpCode - OTP code
 * @param {string} newPassword - New password
 * @param {string} ipAddress - Request IP
 * @param {object} userAgent - User agent info
 * @returns {Promise<object>} - { success: boolean, message: string }
 */
const resetPassword = async (email, otpCode, newPassword, ipAddress, userAgent) => {
  // Validate OTP
  const validation = await otpService.validateOtp(email, 'password_reset', otpCode);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid or expired OTP');
  }

  // Get user
  const user = await userModel.getUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  // Hash new password
  const newPasswordHash = await bcryptUtils.hashPassword(newPassword);

  // Update password
  const updated = await userModel.updatePassword(user.id, newPasswordHash);
  if (!updated) {
    throw new Error('Failed to update password');
  }

  // Invalidate all active sessions (security)
  await sessionModel.invalidateAllUserSessions(user.id);

  // Send confirmation email
  await emailService.sendPasswordResetConfirmation(email);

  // Audit log
  await auditService.createAuditLog({
    userId: user.id,
    action: 'PASSWORD_RESET',
    tableName: 'users',
    recordId: user.id,
    newData: { password_reset: true },
    ipAddress,
    userAgent
  });

  return {
    success: true,
    message: 'Password reset successful'
  };
};

module.exports = {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  logout,
  requestPasswordReset,
  resetPassword
};