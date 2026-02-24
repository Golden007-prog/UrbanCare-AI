// ──────────────────────────────────────────────────────────
// Voice Routes — /api/voice/*
// ──────────────────────────────────────────────────────────
//
// Endpoints:
//   POST   /api/voice/message           — Process voice/text message
//   GET    /api/voice/history/:patientId — Fetch chat history
//   DELETE /api/voice/history/:chatId    — Delete specific chat
//   DELETE /api/voice/cleanup            — Manual expired chat cleanup
// ──────────────────────────────────────────────────────────

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const {
  processVoiceMessage,
  processTextMessage,
  getHistory,
  deleteExpiredChats,
  deleteChat,
} = require('../agents/VoiceClinicalCopilotAgent');

const router = express.Router();

// All voice routes require authentication
router.use(requireAuth);

// Rate limit: 20 voice requests per minute
const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many voice requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────
// POST /api/voice/message
// Body: { audioBase64?, message?, patientId, mimeType?, patientContext? }
//
// If audioBase64 is provided → voice pipeline (STT → reasoning → rewrite)
// If only message is provided → text pipeline (reasoning → rewrite)
// ──────────────────────────────────────────────────────────

router.post('/message', voiceLimiter, async (req, res) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Voice pipeline timed out. Please try again.' });
    }
  }, 90000); // 90s overall timeout

  try {
    const { audioBase64, message, patientId, mimeType, patientContext } = req.body;
    const doctorId = req.user?.id || 'unknown';

    if (!patientId) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Missing required field: patientId',
      });
    }

    if (!audioBase64 && !message) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Missing required field: audioBase64 or message',
      });
    }

    console.log(`  🎤 Voice pipeline: patient=${patientId}, doctor=${doctorId}, mode=${audioBase64 ? 'audio' : 'text'}`);

    let result;
    if (audioBase64) {
      result = await processVoiceMessage({
        audioBase64,
        patientId,
        doctorId,
        mimeType: mimeType || 'audio/webm',
        patientContext: patientContext || {},
      });
    } else {
      result = await processTextMessage({
        message,
        patientId,
        doctorId,
        patientContext: patientContext || {},
      });
    }

    clearTimeout(timeout);
    res.json({ success: true, data: result });
  } catch (err) {
    clearTimeout(timeout);
    console.error('❌ voice/message error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/voice/history/:patientId
// Query: ?limit=50
// ──────────────────────────────────────────────────────────

router.get('/history/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const history = await getHistory(patientId, limit);

    res.json({
      success: true,
      data: {
        patientId,
        messages: history,
        count: history.length,
      },
    });
  } catch (err) {
    console.error('❌ voice/history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// DELETE /api/voice/history/:chatId — delete specific message
// ──────────────────────────────────────────────────────────

router.delete('/history/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const deleted = await deleteChat(parseInt(chatId));

    res.json({
      success: true,
      data: { deleted, chatId },
    });
  } catch (err) {
    console.error('❌ voice/delete error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// DELETE /api/voice/cleanup — manual expired cleanup
// ──────────────────────────────────────────────────────────

router.delete('/cleanup', async (req, res) => {
  try {
    const count = await deleteExpiredChats();
    res.json({
      success: true,
      data: { deletedCount: count },
    });
  } catch (err) {
    console.error('❌ voice/cleanup error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
