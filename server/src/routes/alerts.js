// ──────────────────────────────────────────────────────────
// Alerts Routes — /api/patients/:patientId/alerts
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const hospitalIsolation = require('../middleware/hospitalIsolationMiddleware');
const AlertModel = require('../models/Alert');
const patientService = require('../services/patientService');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, hospitalIsolation);

// ── GET /api/patients/:patientId/alerts ──

router.get('/', (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }
  const alerts = AlertModel.getByPatientID(req.params.patientId);
  res.json({ success: true, data: alerts });
});

// ── POST /api/patients/:patientId/alerts ──

router.post('/', (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }
  const alert = AlertModel.create({
    patientID: req.params.patientId,
    type: req.body.type,
    message: req.body.message,
  });
  res.status(201).json({ success: true, data: alert });
});

module.exports = router;
