const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../models/HospitalSettings');
const { getByHospital: getAgentStatus, setIdle: resetAgentStatus } = require('../models/AgentStatus');
const { getAuditLogs, addLog } = require('../models/SystemLog');
const { encrypt } = require('../utils/crypto');
const { findByHospital, createUser, sanitize } = require('../models/User');

const router = express.Router();

// All routes require HOSPITAL_ADMIN role
router.use(requireAuth);
router.use(requireRole('hospital_admin'));

// ──────────────────────────────────────────────────────────
// GET /api/hospital-admin/settings
// ──────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const settings = getSettings(hospitalId);

  // Never send actual tokens to the client
  const safeSettings = {
    ...settings,
    hasHfToken: !!settings.hf_token_encrypted,
    hasGeminiKey: !!settings.gemini_api_key_encrypted,
  };
  delete safeSettings.hf_token_encrypted;
  delete safeSettings.gemini_api_key_encrypted;

  res.json({ success: true, data: safeSettings });
});

// ──────────────────────────────────────────────────────────
// POST /api/hospital-admin/settings/update
// ──────────────────────────────────────────────────────────
router.post('/settings/update', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const { hf_token, gemini_api_key, offline_mode_enabled, edge_model_enabled, model_preference } = req.body;

  const updates = {};
  if (hf_token !== undefined && hf_token.trim() !== '') {
    updates.hf_token_encrypted = encrypt(hf_token);
  }
  if (gemini_api_key !== undefined && gemini_api_key.trim() !== '') {
    updates.gemini_api_key_encrypted = encrypt(gemini_api_key);
  }
  if (offline_mode_enabled !== undefined) {
    updates.offline_mode_enabled = offline_mode_enabled;
  }
  if (edge_model_enabled !== undefined) {
    updates.edge_model_enabled = edge_model_enabled;
  }
  if (model_preference) {
    updates.model_preference = model_preference;
  }

  const newSettings = updateSettings(hospitalId, updates);

  addLog({
    hospitalId,
    eventType: 'SETTINGS_UPDATE',
    message: `Hospital settings updated by Admin`,
    userId: req.user.id
  });

  // Safe response
  const safeSettings = {
    ...newSettings,
    hasHfToken: !!newSettings.hf_token_encrypted,
    hasGeminiKey: !!newSettings.gemini_api_key_encrypted,
  };
  delete safeSettings.hf_token_encrypted;
  delete safeSettings.gemini_api_key_encrypted;

  res.json({ success: true, data: safeSettings });
});

// ──────────────────────────────────────────────────────────
// GET /api/hospital-admin/agents
// ──────────────────────────────────────────────────────────
router.get('/agents', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const agents = getAgentStatus(hospitalId);
  res.json({ success: true, data: agents });
});

// ──────────────────────────────────────────────────────────
// POST /api/hospital-admin/agents/:name/restart
// ──────────────────────────────────────────────────────────
router.post('/agents/:name/restart', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const agentName = req.params.name;
  
  resetAgentStatus(hospitalId, agentName);

  addLog({
    hospitalId,
    eventType: 'AGENT_RESTART',
    message: `Agent ${agentName} manually restarted by Admin`,
    userId: req.user.id
  });

  res.json({ success: true, message: `Agent ${agentName} restarted.` });
});

// ──────────────────────────────────────────────────────────
// GET /api/hospital-admin/audit-logs
// ──────────────────────────────────────────────────────────
router.get('/audit-logs', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const { userId, patientId } = req.query;
  
  const logs = getAuditLogs(hospitalId, { userId, patientId });
  res.json({ success: true, data: logs });
});

// ──────────────────────────────────────────────────────────
// GET /api/hospital-admin/users — List users in this hospital
// ──────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const users = findByHospital(hospitalId).map(sanitize);
  res.json({ success: true, data: users });
});

// ──────────────────────────────────────────────────────────
// POST /api/hospital-admin/users — Add a user to this hospital
// ──────────────────────────────────────────────────────────
router.post('/users', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const { name, email, password, role, specialty } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, error: 'name, email, and role are required.' });
  }

  const allowedRoles = ['doctor', 'lab', 'pharmacist'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, error: `Role must be one of: ${allowedRoles.join(', ')}` });
  }

  const newUser = createUser({
    name,
    email,
    password: password || 'urbancare123',
    role,
    hospitalID: hospitalId,
    specialty: specialty || null,
  });

  addLog({
    hospitalId,
    eventType: 'USER_CREATED',
    message: `New ${role} account created: ${name} (${email})`,
    userId: req.user.id
  });

  res.json({ success: true, data: sanitize(newUser), message: `${role} account created.` });
});

// ──────────────────────────────────────────────────────────
// GET /api/hospital-admin/metrics — Hospital-scoped analytics
// ──────────────────────────────────────────────────────────
router.get('/metrics', (req, res) => {
  const hospitalId = req.user.hospitalID;
  const agents = getAgentStatus(hospitalId);
  const users = findByHospital(hospitalId);

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const failedAgents = agents.filter(a => a.status === 'failed').length;
  const avgLatency = agents.reduce((acc, a) => acc + a.avg_latency_ms, 0) / (agents.length || 1);

  // Mock analytics
  const aiCallsPerDay = [42, 65, 51, 78, 93, 110, 88];
  const reportsUploaded = 47;
  const patientsCount = Math.floor(Math.random() * 200) + 50;
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  res.json({
    success: true,
    data: {
      activeAgents,
      failedAgents,
      totalAgents: agents.length,
      avgLatencyMs: Math.round(avgLatency),
      totalUsers: users.length,
      doctors: users.filter(u => u.role === 'doctor').length,
      labs: users.filter(u => u.role === 'lab').length,
      pharmacists: users.filter(u => u.role === 'pharmacist').length,
      aiCallsPerDay,
      reportsUploaded,
      patientsCount,
      dayLabels,
    }
  });
});

module.exports = router;
