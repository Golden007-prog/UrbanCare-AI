// ──────────────────────────────────────────────────────────
// Agent #2 — Medical Image Confirm Agent
// Model: google/medsiglip-448
// Layer: Classification
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class MedicalImageConfirmAgent extends BaseAgent {
  constructor() {
    super({
      id: 'medical-image-confirm',
      name: 'Medical Image Confirm Agent',
      number: 2,
      layer: 'Classification',
      layerNumber: 1,
      modelId: 'google/medsiglip-448',
      modelName: 'MedSigLIP',
      task: 'zero-shot-image-classification',
      description: 'Confirms and classifies medical image type using contrastive vision-language model',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;
    const IMAGE_TYPES = ['chest_xray', 'ct_scan', 'mri', 'skin_lesion', 'ecg', 'fundoscopy', 'ultrasound', 'pathology_slide', 'dental_xray', 'non_medical'];

    if (imageBase64 && hf.isConfigured()) {
      try {
        // MedSigLIP uses zero-shot image classification
        const result = await hf.imageTextToText(options.modelId, imageBase64,
          `Classify this medical image into one of: ${IMAGE_TYPES.join(', ')}. Respond with JSON: {"imageType": "<type>", "confidence": <0-1>, "bodyRegion": "<region>"}`,
          { maxTokens: 100 }
        );
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { imageType: parsed.imageType || 'unknown', confidence: parsed.confidence || 0.5, bodyRegion: parsed.bodyRegion || 'unknown', model: options.modelId, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ MedSigLIP failed, using heuristic: ${err.message}`);
      }
    }

    // Heuristic fallback — returns a plausible classification for demo
    return {
      imageType: 'chest_xray',
      confidence: 0.78,
      bodyRegion: 'thorax',
      anatomicalStructures: ['lungs', 'heart', 'ribs', 'diaphragm'],
      mock: true,
    };
  }
}

module.exports = MedicalImageConfirmAgent;
