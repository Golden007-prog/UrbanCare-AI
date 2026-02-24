// ──────────────────────────────────────────────────────────
// Database Configuration — AlloyDB (PostgreSQL 17) via pg
// ──────────────────────────────────────────────────────────

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // AlloyDB-friendly pool settings
  max: 20,                   // max connections in pool
  idleTimeoutMillis: 30000,  // close idle clients after 30s
  connectionTimeoutMillis: 10000, // fail if connection takes > 10s
  ssl: { rejectUnauthorized: false }, // Enforce SSL for AlloyDB public IP
});

// ── Connection lifecycle logging ──────────────────────────

pool.on('connect', () => {
  console.log('📦  New client connected to AlloyDB');
});

pool.on('error', (err) => {
  console.error('❌  Unexpected AlloyDB pool error:', err.message);
  // Don't crash — the pool will attempt to reconnect automatically.
  // Only exit on truly unrecoverable errors.
  if (err.message.includes('terminate')) {
    console.error('💀  Fatal database error — shutting down.');
    process.exit(1);
  }
});

// ── Helper: run a parameterized query ─────────────────────

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`🔍  Query executed in ${duration}ms — rows: ${result.rowCount}`);
    return result;
  } catch (err) {
    console.error('❌  Query error:', err.message);
    throw err;
  }
}

// ── Health check ──────────────────────────────────────────

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅  AlloyDB connection verified:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌  AlloyDB connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, query, testConnection };
