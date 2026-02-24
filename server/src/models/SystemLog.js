// ──────────────────────────────────────────────────────────
// System Logs / Audit Trail Model — In-Memory Store
// ──────────────────────────────────────────────────────────

const systemLogs = [];

/**
 * Add an audit log entry.
 */
function addLog({ hospitalId, eventType, message, severity = 'info', userId = null, patientId = null }) {
  const log = {
    id: systemLogs.length + 1,
    hospital_id: hospitalId,
    event_type: eventType,
    message,
    severity,
    timestamp: new Date().toISOString(),
    user_id: userId,
    patient_id: patientId,
  };
  systemLogs.push(log);
  return log;
}

/**
 * Fetch logs for a specific hospital, optionally filtered by user, patient, or time.
 */
function getAuditLogs(hospitalId, filters = {}) {
  let logs = hospitalId ? systemLogs.filter((l) => l.hospital_id === hospitalId) : [...systemLogs];

  if (filters.userId) {
    logs = logs.filter((l) => l.user_id === filters.userId);
  }
  if (filters.patientId) {
    logs = logs.filter((l) => l.patient_id === filters.patientId);
  }
  
  // Sort newest first
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getAllLogs(limit = 100) {
    return systemLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}

module.exports = {
  addLog,
  getAuditLogs,
  getAllLogs
};
