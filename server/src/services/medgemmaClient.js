const { imageTextToText, buildFractureAnalysisPrompt, parseFractureResponse } = require('../ai/huggingfaceClient');

const MEDGEMMA_MODEL = 'google/medgemma-4b-it';

/**
 * Analyzes a specific image (can be a cropped region or full image) 
 * for fractures and abnormalities using MedGemma.
 *
 * @param {string} imageBase64 - Base64 encoded JPEG/PNG image data
 * @param {Object} context - Optional context about the patient and region
 * @returns {Promise<Object>} Structured JSON finding
 */
async function analyzeCrop(imageBase64, context = {}) {
  // Build a targeted prompt using the existing builder
  const prompt = buildFractureAnalysisPrompt({
    region_focus: context.label || 'unknown region',
    image_type: 'xray',
    is_cropped: context.isCropped || false,
    patient: context.patient || {},
    question: context.question
  });

  try {
    const startObj = Date.now();
    
    // Call MedGemma (huggingfaceClient handles endpoint routing and token selection)
    const result = await imageTextToText(MEDGEMMA_MODEL, imageBase64, prompt, {
      maxTokens: 512,
      temperature: 0.1, // very low temp for factual medical descriptions
      timeoutMs: 60000 
    });

    // Parse the output to guaranteed structured JSON format
    const structured = parseFractureResponse(result.generated_text);
    
    return {
      success: true,
      findings: structured,
      source: result.source,
      timeMs: Date.now() - startObj
    };
  } catch (error) {
    console.error(`  ❌ MedGemma crop analysis failed for ${context.label || 'image'}:`, error.message);
    return {
      success: false,
      error: error.message,
      findings: {
        findings: "Analysis failed due to endpoint error.",
        fracture_detected: false,
        confidence: 0,
        clinical_recommendation: "Manual evaluation required."
      }
    };
  }
}

module.exports = { analyzeCrop };
