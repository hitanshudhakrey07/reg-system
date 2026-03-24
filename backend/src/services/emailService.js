/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Service for sending emails and logging them.
 */

const { sendEmail } = require('../config/email');
const emailLogModel = require('../models/emailLogModel');

/**
 * Send OTP email for registration or password reset
 * @param {string} email - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} type - 'registration' or 'password_reset'
 * @returns {Promise<object>} - { success, messageId, error? }
 */
const sendOtpEmail = async (email, otpCode, type) => {
  const subject = type === 'registration'
    ? 'Verify Your Email Address'
    : 'Password Reset OTP';

  const text = `Your OTP code is: ${otpCode}. This code will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${subject}</h2>
      <p>Your OTP code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; background: #f4f4f4; padding: 10px; text-align: center;">${otpCode}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, text, html });

  // Log the email attempt
  await emailLogModel.createEmailLog({
    email,
    type,
    subject,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.success ? null : result.error,
    messageId: result.success ? result.messageId : null
  });

  return result;
};

/**
 * Send password reset success confirmation email
 * @param {string} email - Recipient email address
 * @returns {Promise<object>} - { success, messageId, error? }
 */
const sendPasswordResetConfirmation = async (email) => {
  const subject = 'Password Reset Successful';
  const text = 'Your password has been successfully reset. If you did not perform this action, please contact support immediately.';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you did not perform this action, please contact our support team immediately.</p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, text, html });

  await emailLogModel.createEmailLog({
    email,
    type: 'password_reset_confirmation',
    subject,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.success ? null : result.error,
    messageId: result.success ? result.messageId : null
  });

  return result;
};

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @returns {Promise<object>} - { success, messageId, error? }
 */
const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Our Platform';
  const text = `Hi ${name},\n\nWelcome to our platform! Your account has been successfully verified. You can now log in and explore our services.\n\nThank you for joining us!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome, ${name}!</h2>
      <p>Thank you for verifying your email address. Your account is now active.</p>
      <p>You can now log in and start using our platform.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, text, html });

  await emailLogModel.createEmailLog({
    email,
    type: 'welcome',
    subject,
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.success ? null : result.error,
    messageId: result.success ? result.messageId : null
  });

  return result;
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetConfirmation,
  sendWelcomeEmail
};