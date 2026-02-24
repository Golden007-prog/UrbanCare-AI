// ──────────────────────────────────────────────────────────
// Voice Clinical Copilot — Database Migration
// ──────────────────────────────────────────────────────────
//
// Creates:
//   • voice_chat_history   — stores doctor/assistant turns
//   • patient_memory_vectors — stores embeddings for context
//
// Usage:  node src/migrations/voice_tables.js
// ──────────────────────────────────────────────────────────

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { pool } = require('../config/db');

const VOICE_CHAT_HISTORY_SQL = `
CREATE TABLE IF NOT EXISTS voice_chat_history (
    id              SERIAL PRIMARY KEY,
    patient_id      VARCHAR(50) NOT NULL,
    doctor_id       VARCHAR(50) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'assistant')),
    message_text    TEXT NOT NULL,
    audio_url       TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_voice_chat_patient ON voice_chat_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_doctor ON voice_chat_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_voice_chat_expires ON voice_chat_history(expires_at);
`;

const PATIENT_MEMORY_VECTORS_SQL = `
CREATE TABLE IF NOT EXISTS patient_memory_vectors (
    id              SERIAL PRIMARY KEY,
    patient_id      VARCHAR(50) NOT NULL,
    embedding       TEXT,
    content_text    TEXT NOT NULL,
    source_type     VARCHAR(50) NOT NULL CHECK (source_type IN ('xray', 'lab', 'soap', 'notes', 'prescription', 'vitals')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_patient ON patient_memory_vectors(patient_id);
CREATE INDEX IF NOT EXISTS idx_memory_source ON patient_memory_vectors(source_type);
`;

async function migrate() {
  console.log('🔄  Running voice tables migration...\n');

  try {
    await pool.query(VOICE_CHAT_HISTORY_SQL);
    console.log('✅  voice_chat_history table ready');

    await pool.query(PATIENT_MEMORY_VECTORS_SQL);
    console.log('✅  patient_memory_vectors table ready');

    console.log('\n🎉  Migration complete!');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate, VOICE_CHAT_HISTORY_SQL, PATIENT_MEMORY_VECTORS_SQL };
