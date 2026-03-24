/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Load and validate environment variables. Exports a config object.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'OTP_EXPIRY_MINUTES',
  'BCRYPT_ROUNDS'
];

// Check for missing variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Build config object
const config = {
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10)
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
    secure: process.env.EMAIL_SECURE === 'true'
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
  },
  rateLimit: {
    otpRequest: {
      windowMs: parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS || '3600000', 10),
      max: parseInt(process.env.RATE_LIMIT_OTP_MAX || '3', 10)
    },
    login: {
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10)
    },
    passwordReset: {
      windowMs: parseInt(process.env.RATE_LIMIT_PW_RESET_WINDOW_MS || '3600000', 10),
      max: parseInt(process.env.RATE_LIMIT_PW_RESET_MAX || '2', 10)
    },
    api: {
      windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10)
    }
  }
};

// Additional validation for numbers
if (isNaN(config.port)) {
  console.error('PORT must be a number');
  process.exit(1);
}
if (isNaN(config.db.port)) {
  console.error('DB_PORT must be a number');
  process.exit(1);
}
if (isNaN(config.otp.expiryMinutes)) {
  console.error('OTP_EXPIRY_MINUTES must be a number');
  process.exit(1);
}
if (isNaN(config.bcrypt.rounds)) {
  console.error('BCRYPT_ROUNDS must be a number');
  process.exit(1);
}

// Defaults for optional rate limits
config.rateLimit.otpRequest.windowMs = config.rateLimit.otpRequest.windowMs || 3600000;
config.rateLimit.otpRequest.max = config.rateLimit.otpRequest.max || 3;
config.rateLimit.login.windowMs = config.rateLimit.login.windowMs || 900000;
config.rateLimit.login.max = config.rateLimit.login.max || 5;
config.rateLimit.passwordReset.windowMs = config.rateLimit.passwordReset.windowMs || 3600000;
config.rateLimit.passwordReset.max = config.rateLimit.passwordReset.max || 2;
config.rateLimit.api.windowMs = config.rateLimit.api.windowMs || 60000;
config.rateLimit.api.max = config.rateLimit.api.max || 100;

// Ensure NODE_ENV is valid
if (!['development', 'production', 'test'].includes(config.env)) {
  console.error('NODE_ENV must be one of: development, production, test');
  process.exit(1);
}

module.exports = config;