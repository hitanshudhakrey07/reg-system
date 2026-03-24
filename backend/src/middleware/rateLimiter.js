/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Rate limiting middleware for various endpoints.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Rate limiter for OTP requests (registration and password reset)
 * Limits based on email (using req.body.email) or IP as fallback.
 */
const otpLimiter = rateLimit({
  windowMs: config.rateLimit.otpRequest.windowMs,
  max: config.rateLimit.otpRequest.max,
  keyGenerator: (req) => {
    // Use email if present, otherwise fallback to IP
    return req.body.email || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please try again later.'
    }
  },
  skipSuccessfulRequests: false // Count all requests
});

/**
 * Rate limiter for login attempts
 * Limits based on IP address.
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.'
    }
  }
});

/**
 * Rate limiter for password reset requests
 * Limits based on email or IP.
 */
const passwordResetLimiter = rateLimit({
  windowMs: config.rateLimit.passwordReset.windowMs,
  max: config.rateLimit.passwordReset.max,
  keyGenerator: (req) => req.body.email || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.'
    }
  }
});

/**
 * General API rate limiter for authenticated endpoints
 * Limits based on user ID if available, otherwise IP.
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  keyGenerator: (req) => {
    // If authenticated, use user ID; otherwise IP
    return req.user?.id || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  skip: (req) => {
    // Optionally skip for certain users (e.g., admins)
    return req.user?.role === 'admin';
  }
});

module.exports = {
  otpLimiter,
  loginLimiter,
  passwordResetLimiter,
  apiLimiter
};