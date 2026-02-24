const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { findAll, findById: findHospitalById, create: createHospital, suspend, unsuspend } = require('../models/Hospital');
const { getAll: getAllAgentStatuses } = require('../models/AgentStatus');
const { getAllLogs } = require('../models/SystemLog');

const router = express.Router();

// All routes require SUPER_ADMIN role
router.use(requireAuth);
router.use(requireRole('super_admin'));

// ──────────────────────────────────────────────────────────
// GET /api/admin/metrics — Global system metrics
// ──────────────────────────────────────────────────────────
router.get('/metrics', (req, res) => {
  const hospitals = findAll();
  const agentStatuses = getAllAgentStatuses();
  
  const activeAgents = agentStatuses.filter(a => a.status === 'active').length;
  const failedAgents = agentStatuses.filter(a => a.status === 'failed').length;
  const idleAgents = agentStatuses.filter(a => a.status === 'idle').length;
  const avgLatency = agentStatuses.reduce((acc, a) => acc + a.avg_latency_ms, 0) / (agentStatuses.length || 1);

  // Mock analytics data for charts
  const aiCallsPerDay = [150, 220, 180, 250, 310, 400, 450];
  const agentFailuresPerDay = [2, 1, 3, 0, 1, 0, 0];
  const avgResponseTimePerDay = [320, 290, 410, 280, 260, 310, 250];
  const storageUsageMB = [1200, 1250, 1340, 1380, 1400, 1450, 1520];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Model usage breakdown (mock)
  const modelUsage = {
    'medgemma-4b-it': 340,
    'medgemma-4b-it': 120,
    'txgemma-9b': 280,
    'txgemma-27b': 60,
    'txgemma-2b': 90,
    'gemini-pro': 210,
  };

  // API cost estimation (mock)
  const apiCostEstimate = {
    huggingface: 245.50,
    gemini: 890.39,
    storage: 110.00,
    total: 1245.89,
    currency: 'USD',
  };

  res.json({
    success: true,
    data: {
      totalHospitals: hospitals.length,
      activeHospitals: hospitals.filter(h => !h.suspended).length,
      activeAgents,
      failedAgents,
      idleAgents,
      avgLatencyMs: Math.round(avgLatency),
      aiCallsPerDay,
      agentFailuresPerDay,
      avgResponseTimePerDay,
      storageUsageMB,
      dayLabels,
      modelUsage,
      apiCostEstimate,
    }
  });
});

// ──────────────────────────────────────────────────────────
// GET /api/admin/hospitals — List all hospitals
// ──────────────────────────────────────────────────────────
router.get('/hospitals', (req, res) => {
  const hospitals = findAll();
  res.json({ success: true, data: hospitals });
});

// ──────────────────────────────────────────────────────────
// POST /api/admin/hospitals — Create a hospital
// ──────────────────────────────────────────────────────────
router.post('/hospitals', (req, res) => {
  const { name, address, contact_email, subscription_plan } = req.body;
  if (!name || !address || !contact_email) {
    return res.status(400).json({ success: false, error: 'name, address, and contact_email are required.' });
  }
  const hospital = createHospital({ name, address, contact_email, subscription_plan });
  res.json({ success: true, data: hospital, message: 'Hospital created.' });
});

// ──────────────────────────────────────────────────────────
// POST /api/admin/hospitals/:id/suspend — Suspend a hospital
// ──────────────────────────────────────────────────────────
router.post('/hospitals/:id/suspend', (req, res) => {
  const hospital = findHospitalById(req.params.id);
  if (!hospital) {
    return res.status(404).json({ success: false, error: 'Hospital not found.' });
  }
  const updated = hospital.suspended ? unsuspend(req.params.id) : suspend(req.params.id);
  const action = updated.suspended ? 'suspended' : 'reactivated';
  res.json({ success: true, data: updated, message: `Hospital ${action}.` });
});

// ──────────────────────────────────────────────────────────
// GET /api/admin/system-logs — Global system logs
// ──────────────────────────────────────────────────────────
router.get('/system-logs', (req, res) => {
  const logs = getAllLogs(200);
  res.json({ success: true, data: logs });
});

module.exports = router;
