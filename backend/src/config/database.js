/*
 * Developer    : Hitanshu
 * Email        : hitanshudhakrey07@gmail.com
 * Version      : 1.0.0
 * Description  : PostgreSQL connection pool configuration and management.
 */

const { Pool } = require('pg');
const config = require('./env');

// Create a new pool instance using database configuration
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: config.db.maxConnections,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: 5000, // Timeout for acquiring a connection
  // Enable SSL if required in production
  ssl: config.env === 'production' ? { rejectUnauthorized: false } : false
});

// Event handlers for pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // In production, you might want to exit or notify monitoring
  if (config.env === 'production') {
    process.exit(1);
  }
});

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection established successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    // Exit process if cannot connect in production
    if (config.env === 'production') {
      process.exit(1);
    }
    return false;
  }
};

// Execute test connection (non-blocking)
testConnection();

// Export the pool and a helper to get a client (for transactions)
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};