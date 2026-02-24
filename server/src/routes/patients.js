// ──────────────────────────────────────────────────────────
// Patients Routes — /api/patients
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const hospitalIsolation = require('../middleware/hospitalIsolationMiddleware');
const patientService = require('../services/patientService');

const router = express.Router();

// All patient routes require auth + hospital isolation
router.use(requireAuth, hospitalIsolation);

// ── GET /api/patients — List patients for current hospital ──

router.get('/', (req, res) => {
  const patients = patientService.listByHospital(req.hospitalID);
  res.json({ success: true, data: patients });
});

// ── GET /api/patients/:id — Get one patient ──

router.get('/:id', (req, res) => {
  const patient = patientService.getById(req.params.id, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found or not in your hospital.' });
  }
  res.json({ success: true, data: patient });
});

// ── POST /api/patients — Create patient (doctor/admin only) ──

router.post('/', requireRole('doctor', 'admin'), (req, res) => {
  const data = {
    ...req.body,
    hospitalID: req.hospitalID,
    doctorID: req.user.id,
  };
  const patient = patientService.create(data);
  res.status(201).json({ success: true, data: patient });
});

// ── PUT /api/patients/:id — Update patient (doctor/admin only) ──

router.put('/:id', requireRole('doctor', 'admin'), (req, res) => {
  const patient = patientService.update(req.params.id, req.body, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found or not in your hospital.' });
  }
  res.json({ success: true, data: patient });
});

// ── POST /api/patients/:id/admit — Admit patient ──

router.post('/:id/admit', requireRole('doctor', 'admin'), (req, res) => {
  const patient = patientService.admit(req.params.id, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found or not in your hospital.' });
  }
  res.json({ success: true, data: patient, message: 'Patient admitted successfully.' });
});

// ── POST /api/patients/:id/discharge — Discharge patient ──

router.post('/:id/discharge', requireRole('doctor', 'admin'), (req, res) => {
  const patient = patientService.discharge(req.params.id, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found or not in your hospital.' });
  }
  res.json({ success: true, data: patient, message: 'Patient discharged successfully.' });
});

module.exports = router;
