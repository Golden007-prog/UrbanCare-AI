// ──────────────────────────────────────────────────────────
// Vitals Routes — /api/patients/:patientId/vitals
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const hospitalIsolation = require('../middleware/hospitalIsolationMiddleware');
const vitalsService = require('../services/vitalsService');
const patientService = require('../services/patientService');

const router = express.Router({ mergeParams: true });

// All vitals routes require auth + hospital isolation
router.use(requireAuth, hospitalIsolation);

// ── GET /api/patients/:patientId/vitals — Get vitals history ──

router.get('/', (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }
  const history = vitalsService.getHistory(req.params.patientId);
  const latest = vitalsService.getLatest(req.params.patientId);
  res.json({ success: true, data: { history, latest } });
});

// ── POST /api/patients/:patientId/vitals — Record new vitals ──

router.post('/', requireRole('doctor', 'admin'), (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }
  const entry = vitalsService.record({ ...req.body, patientID: req.params.patientId });
  res.status(201).json({ success: true, data: entry });
});

// ── GET /api/patients/:patientId/vitals/live — SSE live stream ──

router.get('/live', (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }

  if (patient.admissionStatus !== 'admitted') {
    return res.status(400).json({
      success: false,
      error: 'Live monitoring is only available for admitted patients.',
    });
  }

  const started = vitalsService.startLiveStream(req.params.patientId, res);
  if (!started) {
    return res.status(500).json({ success: false, error: 'Failed to start live stream.' });
  }
});

module.exports = router;
