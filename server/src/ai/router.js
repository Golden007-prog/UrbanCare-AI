// ──────────────────────────────────────────────────────────
// AI Router — /api/*
// ──────────────────────────────────────────────────────────
//
// Central router that exposes all AI endpoints and delegates
// to the appropriate model adapter (imageModel / textModel).
//
// Endpoints:
//   POST /api/analyze-image      → imageModel.analyze()
//   POST /api/generate-soap      → textModel.generateSOAP()
//   POST /api/generate-referral  → textModel.generateReferral()
//   POST /api/assistant-chat     → textModel.chat()
//   POST /api/ai-consult         → consultModel.consultChat()
//   GET  /api/models             → list available model slots
// ──────────────────────────────────────────────────────────

const express = require('express');
const rateLimit = require('express-rate-limit');
const imageModel = require('./imageModel');
const textModel = require('./textModel');
const speechModel = require('./speechModel');
const consultModel = require('./consultModel');
const { offlineMiddleware, OFFLINE_MODEL_MAP } = require('./offlineMiddleware');

const router = express.Router();

// ── Rate limiter for AI consult ────────────────────────────

const consultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute per IP
  message: { success: false, error: 'Too many requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Middleware: request logging + offline detection ────────

router.use((req, _res, next) => {
  const mode = req.headers['x-offline-mode'] === 'true' || req.body?.offlineMode ? '📴 OFFLINE' : '🟢 ONLINE';
  console.log(`  🤖 AI ${req.method} ${req.originalUrl}  [${mode}]  [${new Date().toISOString()}]`);
  next();
});

router.use(offlineMiddleware);

// Helper: resolve model based on offline flag
function resolveModel(req, defaultSlot) {
  if (req.offlineMode) {
    const offlineModel = OFFLINE_MODEL_MAP[defaultSlot] || defaultSlot;
    console.log(`     → Routing to offline model: ${offlineModel}`);
    return offlineModel;
  }
  return req.body?.model || defaultSlot;
}

// ──────────────────────────────────────────────────────────
// POST /api/analyze-image
// Body: { imageBase64, imageType?, patientContext?, model? }
//   patientContext: { symptoms, vitals, condition, age, gender }
// ──────────────────────────────────────────────────────────

router.post('/analyze-image', async (req, res) => {
  try {
    const { imageBase64, imageType, patientContext } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Missing required field: imageBase64',
        hint: 'Send a base64-encoded medical image',
      });
    }

    const model = resolveModel(req, 'medgemma');

    const result = await imageModel.analyzeMedicalImage({
      imageBase64,
      imageType: imageType || 'chest-xray',
      patientContext: patientContext || {},
      model,
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ analyze-image error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/generate-soap
// Body: { patientName, age, gender, condition, vitals,
//         history?, risk?, notes?, section?, model? }
// ──────────────────────────────────────────────────────────

router.post('/generate-soap', async (req, res) => {
  try {
    const { patientName, age, gender, condition, vitals, history, risk, notes, section } = req.body;

    if (!patientName || !condition) {
      return res.status(400).json({
        error: 'Missing required fields: patientName, condition',
      });
    }

    const model = resolveModel(req, 'txgemma');

    const result = await textModel.generateSOAP({
      patientName,
      age,
      gender,
      condition,
      vitals,
      history,
      risk,
      notes,
      section,
      model,
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ generate-soap error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/generate-referral
// Body: { patient, referringDoctor, targetSpecialty, reason?, notes?, model? }
// ──────────────────────────────────────────────────────────

router.post('/generate-referral', async (req, res) => {
  try {
    const { patient, referringDoctor, targetSpecialty, reason, notes } = req.body;

    if (!patient || !targetSpecialty) {
      return res.status(400).json({
        error: 'Missing required fields: patient, targetSpecialty',
      });
    }

    const model = resolveModel(req, 'txgemma');

    const result = await textModel.generateReferral({
      patient,
      referringDoctor,
      targetSpecialty,
      reason,
      notes,
      model,
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ generate-referral error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/assistant-chat
// Body: { message, history?, patientContext?, model? }
// ──────────────────────────────────────────────────────────

router.post('/assistant-chat', async (req, res) => {
  try {
    const { message, history, patientContext } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Missing required field: message',
      });
    }

    const model = resolveModel(req, 'txgemma');

    const result = await textModel.chat({
      message,
      history,
      patientContext,
      model,
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ assistant-chat error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/ai-consult  (Multilingual AI Copilot)
// Body: { message, history?, patientContext?, language?, action? }
// ──────────────────────────────────────────────────────────

router.post('/ai-consult', consultLimiter, async (req, res) => {
  // 30-second timeout
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Request timed out. Please try again.' });
    }
  }, 30000);

  try {
    const { message, history, patientContext, language, action } = req.body;

    if (!message && !action) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message or action',
      });
    }

    // Validate patientContext has patientId when provided
    if (patientContext && !patientContext.patientId) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'patientContext must include patientId',
      });
    }

    // Strip PHI from logs
    console.log(`     → Copilot request: lang=${language || 'en'}, action=${action || 'chat'}, patient=${patientContext?.patientId || 'none'}`);

    const result = await consultModel.consultChat({
      message: message || '',
      history: history || [],
      patientContext,
      language: language || 'en',
      action,
    });

    clearTimeout(timeout);
    res.json({ success: true, data: result });
  } catch (err) {
    clearTimeout(timeout);
    console.error('❌ ai-consult error:', err.message);
    const status = err.message.includes('Rate limit') ? 429 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/transcribe
// Body: { audio (base64), mimeType?, language? }
// ──────────────────────────────────────────────────────────

router.post('/transcribe', async (req, res) => {
  try {
    const { audio, mimeType, language } = req.body;

    if (!audio) {
      return res.status(400).json({
        error: 'Missing required field: audio (base64-encoded audio data)',
      });
    }

    const model = resolveModel(req, 'medasr');

    const result = await speechModel.transcribeAudio({
      audio: Buffer.from(audio, 'base64'),
      mimeType: mimeType || 'audio/webm',
      language: language || 'en',
      model,
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ transcribe error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/models — list all registered model slots
// ──────────────────────────────────────────────────────────

router.get('/models', (req, res) => {
  const { OFFLINE_MODEL_REGISTRY } = require('./offlineMiddleware');
  res.json({
    image: imageModel.MODEL_REGISTRY,
    text: textModel.MODEL_REGISTRY,
    speech: speechModel.MODEL_REGISTRY,
    offline: OFFLINE_MODEL_REGISTRY,
    currentMode: req.headers['x-offline-mode'] === 'true' ? 'offline' : 'online',
  });
});

module.exports = router;

