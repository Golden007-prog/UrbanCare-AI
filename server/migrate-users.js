require('dotenv').config();
const { query } = require('./src/config/db');

async function createUsersTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'patient',
        hospital_id VARCHAR(50),
        specialty VARCHAR(255),
        address TEXT,
        age INTEGER,
        gender VARCHAR(20),
        google_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ USERS TABLE CREATED');

    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    console.log('✅ INDEXES CREATED');

    // Verify
    const res = await query('SELECT COUNT(*) FROM users');
    console.log('✅ Users count:', res.rows[0].count);

    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  }
}

createUsersTable();
