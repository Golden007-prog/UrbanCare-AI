// ──────────────────────────────────────────────────────────
// Context Builder — Patient Clinical Context Assembler
// ──────────────────────────────────────────────────────────
//
// Collects all available patient data into a structured
// context object for TxGemma clinical reasoning.
//
// Sources:
//   • patients table (demographics, condition)
//   • reports table (labs, xrays)
//   • patient_memory_vectors (past context)
//   • In-memory fallback (from store)
// ──────────────────────────────────────────────────────────

const { query } = require('../config/db');

// ── Fetch patient from DB ─────────────────────────────────

async function fetchPatientInfo(patientId) {
  try {
    const result = await query(
      'SELECT id, name, age, gender, primary_condition, risk_level, admission_status, patient_type FROM patients WHERE id = $1',
      [patientId]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch (err) {
    console.warn('  ⚠️ contextBuilder: patients query failed:', err.message);
  }
  return null;
}

// ── Fetch recent reports ──────────────────────────────────

async function fetchRecentReports(patientId, limit = 5) {
  try {
    const result = await query(
      'SELECT title, mime_type, notes, created_at FROM reports WHERE patient_id = $1 ORDER BY created_at DESC LIMIT $2',
      [patientId, limit]
    );
    return result.rows;
  } catch (err) {
    console.warn('  ⚠️ contextBuilder: reports query failed:', err.message);
    return [];
  }
}

// ── Fetch memory vectors (past context) ───────────────────

async function fetchMemoryContext(patientId, limit = 10) {
  try {
    const result = await query(
      'SELECT content_text, source_type, created_at FROM patient_memory_vectors WHERE patient_id = $1 ORDER BY created_at DESC LIMIT $2',
      [patientId, limit]
    );
    return result.rows;
  } catch (err) {
    console.warn('  ⚠️ contextBuilder: memory vectors query failed:', err.message);
    return [];
  }
}

// ── Fetch recent voice chat history ───────────────────────

async function fetchRecentChats(patientId, limit = 5) {
  try {
    const result = await query(
      'SELECT role, message_text, created_at FROM voice_chat_history WHERE patient_id = $1 ORDER BY created_at DESC LIMIT $2',
      [patientId, limit]
    );
    return result.rows.reverse(); // chronological order
  } catch (err) {
    console.warn('  ⚠️ contextBuilder: chat history query failed:', err.message);
    return [];
  }
}

// ── Main Context Builder ──────────────────────────────────

/**
 * Build comprehensive patient context for TxGemma.
 *
 * @param {string} patientId   — patient identifier
 * @param {string} doctorQuestion — the doctor's transcribed question
 * @param {Object} [extraContext] — additional context from frontend (vitals, etc.)
 * @returns {Object} structured context
 */
async function buildPatientContext(patientId, doctorQuestion = '', extraContext = {}) {
  console.log(`  📋 Building context for patient ${patientId}...`);

  // Fetch all data in parallel
  const [patientInfo, reports, memoryItems, recentChats] = await Promise.all([
    fetchPatientInfo(patientId),
    fetchRecentReports(patientId),
    fetchMemoryContext(patientId),
    fetchRecentChats(patientId),
  ]);

  // Categorize memory items
  const xrayMemory = memoryItems.filter(m => m.source_type === 'xray');
  const labMemory = memoryItems.filter(m => m.source_type === 'lab');
  const soapMemory = memoryItems.filter(m => m.source_type === 'soap');
  const notesMemory = memoryItems.filter(m => m.source_type === 'notes');
  const prescriptionMemory = memoryItems.filter(m => m.source_type === 'prescription');

  // Build structured context
  const context = {
    patient_info: patientInfo ? {
      id: patientInfo.id,
      name: patientInfo.name,
      age: patientInfo.age,
      gender: patientInfo.gender,
      condition: patientInfo.primary_condition,
      risk_level: patientInfo.risk_level,
      admission_status: patientInfo.admission_status,
      patient_type: patientInfo.patient_type,
    } : {
      id: patientId,
      name: extraContext.name || 'Unknown',
      age: extraContext.age || null,
      gender: extraContext.gender || null,
      condition: extraContext.condition || 'Unknown',
      risk_level: extraContext.riskLevel || 'Unknown',
    },

    vitals: extraContext.vitals || {},

    labs: labMemory.length > 0
      ? labMemory.map(m => m.content_text)
      : (reports.filter(r => r.title?.toLowerCase().includes('lab')).map(r => r.notes || r.title)),

    xray: xrayMemory.length > 0
      ? { findings: xrayMemory.map(m => m.content_text) }
      : {},

    soap: soapMemory.length > 0
      ? { summary: soapMemory[0].content_text }
      : (extraContext.notesSummary ? { summary: extraContext.notesSummary } : {}),

    meds: prescriptionMemory.length > 0
      ? prescriptionMemory.map(m => m.content_text)
      : [],

    recent_reports: reports.map(r => ({
      title: r.title,
      type: r.mime_type,
      notes: r.notes,
      date: r.created_at,
    })),

    recent_conversation: recentChats.map(c => ({
      role: c.role,
      message: c.message_text,
    })),

    doctor_question: doctorQuestion,
  };

  console.log(`  ✅ Context built: ${Object.keys(context).length} sections`);
  return context;
}

// ── Save context to memory vectors ────────────────────────

async function saveToMemory(patientId, contentText, sourceType) {
  try {
    await query(
      'INSERT INTO patient_memory_vectors (patient_id, content_text, source_type) VALUES ($1, $2, $3)',
      [patientId, contentText, sourceType]
    );
    console.log(`  💾 Saved ${sourceType} memory for patient ${patientId}`);
  } catch (err) {
    console.warn('  ⚠️ Failed to save memory vector:', err.message);
  }
}

module.exports = { buildPatientContext, saveToMemory };
