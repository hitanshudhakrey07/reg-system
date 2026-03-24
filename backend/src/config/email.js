/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Nodemailer transporter configuration for sending emails.
 */

const nodemailer = require('nodemailer');
const config = require('./env');

// Create transporter based on environment
const createTransporter = () => {
  // For development/testing, we could use ethereal or a test account
  // but we use the provided config
  const transporterConfig = {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  };

  // Additional TLS options if needed
  if (config.env === 'production') {
    // In production, we might enforce stricter TLS
    transporterConfig.tls = {
      rejectUnauthorized: true
    };
  }

  return nodemailer.createTransporter(transporterConfig);
};

const transporter = createTransporter();

// Verify transporter configuration on startup (non-blocking)
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('Email transporter configured successfully');
  } catch (err) {
    console.error('Email transporter verification failed:', err.message);
    // Don't exit the app because email might not be critical, but log error
  }
};

verifyTransporter();

// Helper function to send email with logging placeholder
// (actual logging will be handled by emailService)
const sendEmail = async (options) => {
  const { to, subject, html, text } = options;
  const mailOptions = {
    from: config.email.from,
    to,
    subject,
    html,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  transporter,
  sendEmail,
  config: config.email
};