const { processXRayMultimodal } = require('./XRayPipeline');
const { speechRecognition } = require('../ai/huggingfaceClient');
const { synthesizeXRayReasoning } = require('./txgemmaReasoner');
const fs = require('fs');
const path = require('path');

const MEDASR_MODEL = 'openai/whisper-large-v3';

/**
 * The unified orchestrator for multimodal voice & image queries.
 * 
 * Flow:
 * 1. Process Voice -> Text (if audio provided)
 * 2. If Image is provided -> Run full XRayPipeline (YOLO + MedGemma + TxGemma)
 * 3. Return results (TTS handling happens on frontend via browser APIs)
 * 
 * @param {Object} reqBody 
 * @param {string} reqBody.imageBase64 - Optional image to analyze
 * @param {string} reqBody.voiceQuestion - Optional text question if already transcribed
 * @param {string} reqBody.audioBase64 - Optional audio file to transcribe
 * @param {string} reqBody.audioMimeType - Optional audio mime type
 * @param {Object} reqBody.patientContext - Patient data
 * @param {string} reqBody.mode - 'region' | 'full'
 * @param {Object} reqBody.regionBox - { x, y, w, h } if mode === 'region'
 */
async function orchestrateMultimodal(reqBody) {
  let { imageBase64, voiceQuestion, audioBase64, audioMimeType, patientContext, mode, regionBox } = reqBody;
  mode = mode || 'full';

  // 1. Process Voice -> Text if required
  if (audioBase64 && !voiceQuestion) {
    console.log(`  🎙️ Running STT for multimodal query...`);
    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const sttResult = await speechRecognition(MEDASR_MODEL, audioBuffer);
      voiceQuestion = sttResult.text;
      console.log(`  ✅ Transcribed: "${voiceQuestion}"`);
    } catch (err) {
      console.error(`  ❌ STT failed:`, err);
      throw new Error(`Speech recognition failed: ${err.message}`);
    }
  }

  // Ensure we have some prompt text if an image is provided but no question
  if (imageBase64 && !voiceQuestion) {
    voiceQuestion = mode === 'region'
      ? 'Analyze the selected region of this X-ray and describe the radiological findings.'
      : 'Analyze the entire X-ray and describe the radiological findings.';
  }

  // 2. Decide workflow: Multimodal Image Pipeline or Text-only Reasoning
  if (imageBase64) {
    console.log(`  🖼️ Initiating XRay Multimodal Pipeline (mode: ${mode})...`);
    const result = await processXRayMultimodal(imageBase64, patientContext, voiceQuestion);
    
    // Format response expected by the frontend panel
    return {
      success: true,
      mode: 'multimodal',
      transcript: voiceQuestion !== "Analyze this X-ray and describe the radiological findings." ? voiceQuestion : null,
      analysis: result.assessment,
      pipeline_stats: {
        regions_analyzed: result.regions_analyzed,
        time_ms: result.pipeline_time_ms
      }
    };
  } else {
    // 3. Fallback to just text-reasoning (no image provided)
    console.log(`  📝 Initiating Text-Only Reasoning...`);
    // Pass empty array for medgemmaResults
    const assessment = await synthesizeXRayReasoning({
      medgemmaResults: [], 
      patient: patientContext, 
      voiceQuestion 
    });

    return {
      success: true,
      mode: 'text',
      transcript: voiceQuestion,
      analysis: assessment
    };
  }
}

module.exports = { orchestrateMultimodal };
