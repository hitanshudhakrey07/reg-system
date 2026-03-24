/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : Database queries for audit_logs table.
 */

const db = require('../config/database');

/**
 * Create an audit log entry
 * @param {object} auditData - { userId, action, tableName, recordId, oldData, newData, ipAddress, userAgent }
 * @returns {Promise<object>} - Created audit record
 */
const createAuditLog = async (auditData) => {
  const {
    userId,
    action,
    tableName,
    recordId,
    oldData,
    newData,
    ipAddress,
    userAgent
  } = auditData;

  const query = `
    INSERT INTO audit_logs (
      user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, user_id, action, table_name, record_id, created_at
  `;

  const values = [
    userId || null,
    action,
    tableName || null,
    recordId || null,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null,
    ipAddress || null,
    userAgent || null
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get audit logs with optional filters and pagination
 * @param {object} filters - { userId, action, tableName, fromDate, toDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} - { logs, total, page, limit, pages }
 */
const getAuditLogs = async (filters = {}, pagination = {}) => {
  const { userId, action, tableName, fromDate, toDate } = filters;
  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(100, parseInt(pagination.limit) || 20);
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let values = [];
  let idx = 1;

  if (userId) {
    whereClauses.push(`user_id = $${idx}`);
    values.push(userId);
    idx++;
  }
  if (action) {
    whereClauses.push(`action = $${idx}`);
    values.push(action);
    idx++;
  }
  if (tableName) {
    whereClauses.push(`table_name = $${idx}`);
    values.push(tableName);
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
    FROM audit_logs
    ${whereSql}
  `;
  const countResult = await db.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated data
  const dataQuery = `
    SELECT id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at
    FROM audit_logs
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
 * Get audit logs by user ID
 * @param {string} userId - User ID
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} - Paginated logs for user
 */
const getAuditLogsByUser = async (userId, pagination = {}) => {
  return getAuditLogs({ userId }, pagination);
};

/**
 * Get audit logs by action type
 * @param {string} action - Action name (e.g., LOGIN, VERIFY_OTP)
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} - Paginated logs for action
 */
const getAuditLogsByAction = async (action, pagination = {}) => {
  return getAuditLogs({ action }, pagination);
};

module.exports = {
  createAuditLog,
  getAuditLogs,
  getAuditLogsByUser,
  getAuditLogsByAction
};