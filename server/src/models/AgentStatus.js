// ──────────────────────────────────────────────────────────
// Agent Status Model — In-Memory Store
// ──────────────────────────────────────────────────────────

const agentStatuses = [];

/**
 * Log or update the status of an agent execution.
 */
function logExecution({ hospitalId, agentName, status, error_message, latency_ms }) {
  const existing = agentStatuses.find(
    (a) => a.hospital_id === hospitalId && a.agent_name === agentName
  );

  if (existing) {
    existing.last_run = new Date().toISOString();
    existing.status = status;
    existing.error_message = error_message || null;
    
    // Simple rolling average for latency (could weight it, but this is simple)
    if (latency_ms !== undefined) {
       if (existing.avg_latency_ms === 0) {
           existing.avg_latency_ms = latency_ms;
       } else {
           existing.avg_latency_ms = Math.floor((existing.avg_latency_ms + latency_ms) / 2);
       }
    }
  } else {
    agentStatuses.push({
      id: agentStatuses.length + 1,
      hospital_id: hospitalId,
      agent_name: agentName,
      last_run: new Date().toISOString(),
      status: status, // 'active', 'failed', 'idle'
      error_message: error_message || null,
      avg_latency_ms: latency_ms || 0,
    });
  }
}

/**
 * Get all agent statuses for a specific hospital.
 */
function getByHospital(hospitalId) {
  return agentStatuses.filter((a) => a.hospital_id === hospitalId);
}

/**
 * Get all agent statuses globally.
 */
function getAll() {
    return agentStatuses;
}

/**
 * Restart agent (mock)
 */
function setIdle(hospitalId, agentName) {
  const existing = agentStatuses.find(
    (a) => a.hospital_id === hospitalId && a.agent_name === agentName
  );
  if (existing) {
      existing.status = 'idle';
      existing.error_message = null;
  }
}

module.exports = {
  logExecution,
  getByHospital,
  getAll,
  setIdle,
};
