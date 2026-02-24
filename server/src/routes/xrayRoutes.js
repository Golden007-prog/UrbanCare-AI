const express = require('express');
const router = express.Router();
const multer = require('multer');
const { orchestrateMultimodal } = require('../services/voiceOrchestrator');

// Provide basic in-memory disk storage since we just need base64 for processing
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * POST /api/xray/full-pipeline
 * Main endpoint for the upgraded Multimodal X-Ray analysis.
 * Accepts multipart form data with image and other JSON fields.
 */
router.post('/full-pipeline', upload.single('image'), async (req, res) => {
  try {
    const { voiceQuestion, patientId, audioBase64, audioMimeType, mode, region_box } = req.body;
    let patientContext = null;
    
    // If patient info was passed as JSON string
    if (req.body.patientContext) {
      try {
        patientContext = JSON.parse(req.body.patientContext);
      } catch (e) {
        // use default empty context
      }
    }

    let imageBase64 = req.body.imageBase64;

    // Convert uploaded file to base64 if provided directly as a file instead of raw string
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype;
      imageBase64 = `data:${mime};base64,${b64}`;
    }

    console.log(`\n=================================================`);
    console.log(`📥 [API] POST /api/xray/full-pipeline received`);
    if (imageBase64) console.log(`   - Attached Image: Yes (${Math.round(imageBase64.length / 1024)}KB)`);
    if (voiceQuestion) console.log(`   - Voice Question: "${voiceQuestion.substring(0, 50)}..."`);
    if (mode) console.log(`   - Mode: ${mode}`);
    if (region_box) console.log(`   - Region Box: ${region_box}`);
    if (audioBase64) console.log(`   - Attached Audio: Yes`);
    
    // Orchestrate
    const result = await orchestrateMultimodal({
      imageBase64,
      voiceQuestion,
      audioBase64,
      audioMimeType,
      patientContext,
      mode: mode || 'full',
      regionBox: region_box ? JSON.parse(region_box) : null,
    });

    console.log(`📤 [API] POST /api/xray/full-pipeline completed successfully.`);
    res.json(result);

  } catch (error) {
    console.error(`❌ [API] POST /api/xray/full-pipeline failed:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during X-Ray pipeline processing'
    });
  }
});

module.exports = router;
