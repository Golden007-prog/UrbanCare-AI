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
const { getSettings } = require('../models/HospitalSettings');
const { requireAuth } = require('../middleware/auth');
const { addLog } = require('../models/SystemLog');

const router = express.Router();

router.use(requireAuth);

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
  const hospitalId = req.user?.hospitalID;
  let settings = null;
  if (hospitalId) {
    settings = getSettings(hospitalId);
  }

  const isActuallyOffline = req.offlineMode || settings?.offline_mode_enabled;

  if (isActuallyOffline) {
    const offlineModel = OFFLINE_MODEL_MAP[defaultSlot] || defaultSlot;
    console.log(`     → Routing to offline model: ${offlineModel}`);
    return offlineModel;
  }

  // For image models, always use the slot key ('medgemma') since imageModel.js
  // handles the actual model ID internally via its MODEL_REGISTRY.
  // Hospital settings store full names like 'medgemma-4b-it' which are not
  // valid slot keys for imageModel.analyzeMedicalImage().
  if (defaultSlot === 'medgemma' || defaultSlot === 'medasr') {
    return defaultSlot;
  }

  if (settings && settings.model_preference) {
    if (defaultSlot === 'txgemma' && settings.model_preference.startsWith('txgemma')) {
      return settings.model_preference;
    }
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

    addLog({
      hospitalId: req.user.hospitalID,
      eventType: 'AI_ANALYZE_IMAGE',
      message: `Image analyzed for patient ${patientContext?.patientId || 'unknown'}`,
      userId: req.user.id,
      patientId: patientContext?.patientId || null
    });

    res.json({ success: true, data: { ...result, offlineMode: !!req.offlineMode } });
  } catch (err) {
    console.error('❌ analyze-image error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/image-analyze  (Region-based image analysis)
// Body: { imageBase64, question, selectedRegionCoordinates?,
//         patientContext? }
//   selectedRegionCoordinates: { x, y, width, height } (normalized 0-1)
// ──────────────────────────────────────────────────────────

router.post('/image-analyze', async (req, res) => {
  try {
    const { imageBase64, question, selectedRegionCoordinates, patientContext } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: imageBase64',
      });
    }

    const model = resolveModel(req, 'medgemma');

    // Build a prompt that includes the doctor's question and region info
    const regionInfo = selectedRegionCoordinates
      ? `\nThe doctor has selected a region at (x: ${(selectedRegionCoordinates.x * 100).toFixed(1)}%, y: ${(selectedRegionCoordinates.y * 100).toFixed(1)}%, width: ${(selectedRegionCoordinates.width * 100).toFixed(1)}%, height: ${(selectedRegionCoordinates.height * 100).toFixed(1)}%) of the image.`
      : '';

    const patientInfo = patientContext
      ? `\nPatient: ${patientContext.name || 'Unknown'}, ${patientContext.age || '--'}y, ${patientContext.gender || '--'}. Condition: ${patientContext.condition || 'N/A'}.`
      : '';

    const analysisPrompt = `You are a radiologist AI assistant.${patientInfo}${regionInfo}\n\nDoctor's question: ${question || 'Analyze the selected region of this medical image.'}\n\nProvide a structured analysis in JSON format:\n{"analysis": "overall interpretation", "reasoning": "detailed clinical reasoning", "findings": ["finding 1", "finding 2"], "confidence": "low|moderate|high"}`;

    // Use the same HF client path as analyze-image (picks up dedicated endpoint)
    const hf = require('./huggingfaceClient');

    if (hf.isConfigured()) {
      try {
        const result = await hf.imageTextToText(
          'google/medgemma-4b-it',
          imageBase64,
          analysisPrompt,
          { maxTokens: 512, temperature: 0.2, timeoutMs: 60000 }
        );

        // Parse structured JSON from the response using robust extractor
        const parsed = hf.extractFirstJSON(result.generated_text);

        const data = parsed || {
          analysis: result.generated_text,
          reasoning: result.generated_text,
          findings: ['See full analysis above'],
          confidence: 'moderate',
        };

        addLog({
          hospitalId: req.user.hospitalID,
          eventType: 'AI_IMAGE_ANALYZE_REGION',
          message: `Region analysis for patient ${patientContext?.name || 'unknown'}`,
          userId: req.user.id,
        });

        return res.json({
          success: true,
          data: { ...data, model: 'google/medgemma-4b-it', mock: false, source: result.source || 'huggingface', offlineMode: !!req.offlineMode },
        });
      } catch (err) {
        console.warn('  ⚠️ MedGemma region analysis failed, falling back to mock:', err.message);
      }
    }

    // Mock fallback
    const data = {
      analysis: `Based on the selected region of the medical image, the highlighted area shows anatomical structures consistent with the patient's reported condition (${patientContext?.condition || 'unknown'}). ${question ? `Regarding your question "${question}": ` : ''}The visible structures appear within expected parameters for this imaging modality.`,
      reasoning: `The AI model analyzed the selected region${selectedRegionCoordinates ? ` at coordinates (${(selectedRegionCoordinates.x * 100).toFixed(1)}%, ${(selectedRegionCoordinates.y * 100).toFixed(1)}%)` : ''} against the patient's clinical context. Mock response — connect MedGemma for real inference.`,
      findings: [
        'Region shows anatomical structures within expected parameters',
        'No immediate critical abnormalities detected in selection',
        'Recommend correlation with clinical history and physical examination',
        'Further imaging may be warranted for definitive assessment',
      ],
      confidence: 'moderate',
      model: 'google/medgemma-4b-it',
      mock: true,
      offlineMode: !!req.offlineMode,
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ image-analyze error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/xray-fracture-analyze  (Structured fracture detection)
// Body: { imageBase64, region_focus?, image_type?, patient_context?,
//         is_cropped?, question? }
// Returns: structured JSON with fracture_detected, fracture_type, etc.
// ──────────────────────────────────────────────────────────

router.post('/xray-fracture-analyze', async (req, res) => {
  try {
    const { imageBase64, region_focus, image_type, patient_context, is_cropped, question } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: imageBase64',
      });
    }

    const hf = require('./huggingfaceClient');

    const prompt = hf.buildFractureAnalysisPrompt({
      region_focus: region_focus || 'middle_finger',
      image_type: image_type || 'hand_xray',
      is_cropped: !!is_cropped,
      patient: patient_context || {},
      question: question || '',
    });

    if (hf.isConfigured()) {
      try {
        const result = await hf.imageTextToText(
          'google/medgemma-4b-it',
          imageBase64,
          prompt,
          { maxTokens: 1024, temperature: 0.1, timeoutMs: 90000 }
        );

        const parsed = hf.parseFractureResponse(result.generated_text);

        addLog({
          hospitalId: req.user.hospitalID,
          eventType: 'AI_FRACTURE_ANALYSIS',
          message: `Fracture analysis: ${parsed.fracture_detected ? 'FRACTURE DETECTED' : 'No fracture'} — ${parsed.region_focus}`,
          userId: req.user.id,
        });

        return res.json({
          success: true,
          data: { ...parsed, model: 'google/medgemma-4b-it', mock: false, source: result.source || 'huggingface', offlineMode: !!req.offlineMode },
        });
      } catch (err) {
        console.warn('  ⚠️ MedGemma fracture analysis failed, falling back to mock:', err.message);
      }
    }

    // Mock fallback — clinically realistic example
    const mockData = {
      image_type: image_type || 'hand_xray',
      region_focus: region_focus || 'middle_finger',
      findings: 'AP and oblique views of the hand demonstrate normal bony alignment. The cortical margins of all phalanges, metacarpals, and carpal bones appear intact. Joint spaces are preserved. No definite fracture line is identified. Soft tissues are unremarkable. Note: This is a mock response — connect the MedGemma endpoint for real inference.',
      fracture_detected: false,
      fracture_type: 'none',
      fracture_location: 'none identified',
      displacement: 'none',
      joint_involvement: false,
      confidence: 0.75,
      clinical_recommendation: 'If clinical suspicion remains high, consider repeat imaging in 10-14 days or advanced imaging (CT/MRI) to rule out occult fracture. Correlate with physical examination findings.',
      model: 'google/medgemma-4b-it',
      mock: true,
      offlineMode: !!req.offlineMode,
    };

    res.json({ success: true, data: mockData });
  } catch (err) {
    console.error('❌ xray-fracture-analyze error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/xray/analyze-region  (Production fracture agent)
// Body: { imageBase64, region }
// Always returns structured JSON — never crashes.
// Uses axios + retry + fallback via XRayFractureAgent.
// ──────────────────────────────────────────────────────────

const XRayFractureAgent = require('../../agents/XRayFractureAgent');

router.post('/xray/analyze-region', async (req, res) => {
  try {
    const { imageBase64, region } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: imageBase64',
      });
    }

    const data = await XRayFractureAgent.analyzeRegion(imageBase64, region || 'selected_region');

    addLog({
      hospitalId: req.user?.hospitalID,
      eventType: 'AI_FRACTURE_ANALYSIS_V2',
      message: `Fracture analysis (v2): ${data.fracture_detected ? 'FRACTURE DETECTED' : 'No fracture'} — ${data.region_focus}`,
      userId: req.user?.id,
    });

    return res.json({ success: true, data });
  } catch (err) {
    // Agent should never throw, but guard anyway
    console.error('❌ xray/analyze-region error:', err.message);
    return res.json({
      success: true,
      data: {
        image_type: 'hand_xray',
        region_focus: 'unknown',
        findings: 'Model unavailable',
        fracture_detected: false,
        fracture_type: 'none',
        fracture_location: '',
        displacement: 'none',
        joint_involvement: false,
        confidence: 0,
        clinical_recommendation: 'Retry',
        mock: true,
        source: 'error-fallback',
      },
    });
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

    addLog({
      hospitalId: req.user.hospitalID,
      eventType: 'AI_GENERATE_SOAP',
      message: `SOAP note generated for patient`,
      userId: req.user.id
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
// Body: { message, history?, patientContext?, language?, action?, mode? }
// ──────────────────────────────────────────────────────────

router.post('/ai-consult', consultLimiter, async (req, res) => {
  // 30-second timeout
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: 'Request timed out. Please try again.' });
    }
  }, 30000);

  try {
    const { message, history, patientContext, language, action, mode } = req.body;

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
    console.log(`     → Copilot request: lang=${language || 'en'}, action=${action || 'chat'}, mode=${mode || 'clinical-copilot'}, patient=${patientContext?.patientId || 'none'}`);

    const result = await consultModel.consultChat({
      message: message || '',
      history: history || [],
      patientContext,
      language: language || 'en',
      action,
      mode: mode || null,
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

