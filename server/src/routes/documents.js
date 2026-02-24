// ──────────────────────────────────────────────────────────
// Documents Routes — /api/patients/:patientId/documents
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const hospitalIsolation = require('../middleware/hospitalIsolationMiddleware');
const documentService = require('../services/documentService');
const patientService = require('../services/patientService');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, hospitalIsolation);

// ── GET /api/patients/:patientId/documents — List documents ──
// All authenticated roles can view (family included for read-only)

router.get('/', (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }
  const docs = documentService.listByHospital(req.params.patientId, req.hospitalID);
  res.json({ success: true, data: docs });
});

// ── POST /api/patients/:patientId/documents — Upload document ──
// Allowed: doctor, admin, lab, pharmacist (each with type restrictions)

router.post('/', requireRole('doctor', 'admin', 'lab', 'pharmacist'), (req, res) => {
  const patient = patientService.getById(req.params.patientId, req.hospitalID);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found.' });
  }

  try {
    const doc = documentService.upload({
      patientID: req.params.patientId,
      hospitalID: req.hospitalID,
      type: req.body.type,
      fileURL: req.body.fileURL || '',
      uploadedByUserID: req.user.id,
      uploaderRole: req.user.role,
      title: req.body.title || '',
      notes: req.body.notes || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
