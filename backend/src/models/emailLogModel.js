/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for email_logs table.
 */

const db = require('../config/database');

/**
 * Create an email log entry
 * @param {object} logData - { email, type, subject, status, errorMessage, messageId }
 * @returns {Promise<object>} - Created log record
 */
const createEmailLog = async (logData) => {
  const { email, type, subject, status, errorMessage, messageId } = logData;

  const query = `
    INSERT INTO email_logs (email, type, subject, status, error_message, message_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, type, subject, status, message_id, created_at
  `;

  const values = [email, type, subject, status, errorMessage || null, messageId || null];
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get email logs with filters and pagination
 * @param {object} filters - { email, type, status, fromDate, toDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} - { logs, total, page, limit, pages }
 */
const getEmailLogs = async (filters = {}, pagination = {}) => {
  const { email, type, status, fromDate, toDate } = filters;
  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, parseInt(pagination.limit) || 20);
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let values = [];
  let idx = 1;

  if (email) {
    whereClauses.push(`email = $${idx}`);
    values.push(email);
    idx++;
  }
  if (type) {
    whereClauses.push(`type = $${idx}`);
    values.push(type);
    idx++;
  }
  if (status) {
    whereClauses.push(`status = $${idx}`);
    values.push(status);
    idx++;
  }
  if (fromDate) {
    whereClauses.push(`created_at >= $${idx}`);
    values.push(fromDate);
    idx++;
  }
  if (toDate) {
    whereClauses.push(`created_at <= $${idx}`);
    values.push(toDate);
    idx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM email_logs
    ${whereSql}
  `;
  const countResult = await db.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated data
  const dataQuery = `
    SELECT id, email, type, subject, status, error_message, message_id, created_at
    FROM email_logs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  values.push(limit, offset);
  const dataResult = await db.query(dataQuery, values);

  return {
    logs: dataResult.rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
};

/**
 * Get email logs by email address
 * @param {string} email - Email address
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} - Paginated logs for email
 */
const getEmailLogsByEmail = async (email, pagination = {}) => {
  return getEmailLogs({ email }, pagination);
};

/**
 * Update email log status (e.g., after retry)
 * @param {number} logId - Log record ID
 * @param {string} status - New status ('sent', 'failed')
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<boolean>} - Success status
 */
const updateEmailLogStatus = async (logId, status, errorMessage = null) => {
  const query = `
    UPDATE email_logs
    SET status = $1, error_message = COALESCE($2, error_message)
    WHERE id = $3
    RETURNING id
  `;
  const result = await db.query(query, [status, errorMessage, logId]);
  return result.rowCount > 0;
};

module.exports = {
  createEmailLog,
  getEmailLogs,
  getEmailLogsByEmail,
  updateEmailLogStatus
};