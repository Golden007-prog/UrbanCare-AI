// ──────────────────────────────────────────────────────────
// Agent Routes — /api/agents/*
// ──────────────────────────────────────────────────────────

const express = require('express');
const registry = require('../agents/AgentRegistry');
const orchestrator = require('../agents/AgentOrchestrator');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// GET /api/agents — List all 30 agents with status
// ──────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const status = registry.getStatus();
  res.json({ success: true, data: status });
});

// ──────────────────────────────────────────────────────────
// GET /api/agents/architecture — Full architecture diagram data
// ──────────────────────────────────────────────────────────

router.get('/architecture', (_req, res) => {
  const architecture = registry.getArchitecture();
  res.json({ success: true, data: architecture });
});

// ──────────────────────────────────────────────────────────
// GET /api/agents/layer/:layerNumber — Agents by layer
// ──────────────────────────────────────────────────────────

router.get('/layer/:layerNumber', (req, res) => {
  const layerNum = parseInt(req.params.layerNumber, 10);
  if (isNaN(layerNum) || layerNum < 1 || layerNum > 8) {
    return res.status(400).json({ success: false, error: 'Layer must be 1-8' });
  }
  const agents = registry.getByLayer(layerNum);
  res.json({
    success: true,
    data: {
      layer: layerNum,
      agents: agents.map((a) => a.getInfo()),
    },
  });
});

// ──────────────────────────────────────────────────────────
// GET /api/agents/:id — Get single agent info
// ──────────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const agent = registry.get(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: `Agent not found: ${req.params.id}` });
  }
  res.json({ success: true, data: agent.getInfo() });
});

// ──────────────────────────────────────────────────────────
// POST /api/agents/pipeline — Run full 8-layer pipeline
// Body: { patientContext, imageBase64?, text?, offline? }
// ──────────────────────────────────────────────────────────

router.post('/pipeline', async (req, res) => {
  try {
    const { offline, layers, agents, ...input } = req.body;
    const result = await orchestrator.runPipeline(input, {
      offline: offline || req.headers['x-offline-mode'] === 'true',
      layers,
      agents,
      hospitalId: req.user.hospitalID,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ Pipeline error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/agents/:id/execute — Execute single agent
// Body: { ...input data }
// ──────────────────────────────────────────────────────────

router.post('/:id/execute', async (req, res) => {
  try {
    const offline = req.body.offline || req.headers['x-offline-mode'] === 'true';
    const result = await orchestrator.executeAgent(req.params.id, req.body, {
      offline,
      hospitalId: req.user.hospitalID,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(`❌ Agent ${req.params.id} error:`, err.message);
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/agents/orchestrator/status — Pipeline status
// ──────────────────────────────────────────────────────────

router.get('/orchestrator/status', (_req, res) => {
  res.json({ success: true, data: orchestrator.getStatus() });
});

module.exports = router;
