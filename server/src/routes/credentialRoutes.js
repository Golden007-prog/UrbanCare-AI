// ──────────────────────────────────────────────────────────
// Credential Routes — /api/set-credentials, /api/credentials/*
// ──────────────────────────────────────────────────────────

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const credentialStore = require('../services/credentialStore');

const router = express.Router();

// Rate limit credential endpoints to prevent brute-force
const credLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  message: { success: false, error: 'Too many credential requests. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// POST /api/set-credentials
// Body: { hfToken, geminiKey }
// Stores keys in server memory for the current user session.
// ──────────────────────────────────────────────────────────

router.post('/set-credentials', credLimiter, (req, res) => {
  try {
    const { hfToken, geminiKey } = req.body;

    if (!hfToken || typeof hfToken !== 'string' || hfToken.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Invalid HuggingFace token. Must be at least 4 characters.',
      });
    }

    if (!geminiKey || typeof geminiKey !== 'string' || geminiKey.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Gemini API key. Must be at least 4 characters.',
      });
    }

    credentialStore.set(req.user.id, hfToken.trim(), geminiKey.trim());

    console.log(`🔑 Credentials stored for user ${req.user.id} (${req.user.email})`);

    res.json({
      success: true,
      message: 'Credentials stored securely in session.',
    });
  } catch (err) {
    console.error('❌ set-credentials error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to store credentials.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/credentials/status
// Returns whether the user has stored credentials.
// NEVER returns the actual keys.
// ──────────────────────────────────────────────────────────

router.get('/credentials/status', (req, res) => {
  const hasCredentials = credentialStore.has(req.user.id);
  res.json({ hasCredentials });
});

// ──────────────────────────────────────────────────────────
// DELETE /api/credentials
// Clears stored credentials for the current user.
// ──────────────────────────────────────────────────────────

router.delete('/credentials', (req, res) => {
  credentialStore.clear(req.user.id);
  console.log(`🗑️  Credentials cleared for user ${req.user.id}`);
  res.json({ success: true, message: 'Credentials cleared.' });
});

module.exports = router;
