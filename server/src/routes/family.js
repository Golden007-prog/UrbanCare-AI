// ──────────────────────────────────────────────────────────
// Family Routes — /api/family
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');
const familyService = require('../services/familyService');

const router = express.Router();

// ── POST /api/family/generate-link — Generate family access token ──
// (Doctor only — generates a sharable read-only link)

router.post('/generate-link', requireAuth, requireRole('doctor', 'admin'), (req, res) => {
  const { patientID } = req.body;

  if (!patientID) {
    return res.status(400).json({ success: false, error: 'patientID is required.' });
  }

  const access = familyService.generateToken(patientID, req.body.familyUserID || null);

  res.status(201).json({
    success: true,
    data: {
      token: access.token,
      expiresAt: access.expiresAt,
      link: `/family/${access.token}`,
    },
  });
});

// ── GET /api/family/:token — Public read-only patient portal ──
// (No auth required — token-based access)

router.get('/:token', (req, res) => {
  const portalData = familyService.getPortalData(req.params.token);

  if (!portalData) {
    return res.status(404).json({
      success: false,
      error: 'Invalid or expired family access link.',
    });
  }

  res.json({ success: true, data: portalData });
});

module.exports = router;
