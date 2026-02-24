// ──────────────────────────────────────────────────────────
// Agent #16 — X-ray Analyzer
// Model: google/medgemma-4b-it  |  Edge: quantized 4B
// Layer: Multimodal Image
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');
const { CLINICAL_SYSTEM_PROMPT, RADIOLOGY_JSON_TEMPLATE } = require('../../config/clinicalSystemPrompt');

class XRayAnalyzer extends BaseAgent {
  constructor() {
    super({
      id: 'xray-analyzer',
      name: 'X-ray Analyzer',
      number: 16,
      layer: 'Multimodal Image',
      layerNumber: 4,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Analyzes chest X-rays for pathological findings with structured reporting',
      offlineModelId: 'google/medgemma-4b-it', // same model, quantized GGUF on edge
    });
  }

  async process(input, options) {
    const { imageBase64, imageType, patientContext } = input;

    if (imageBase64 && hf.isConfigured()) {
      try {
        // Use specialized fracture prompt for hand/extremity X-rays
        const isHandXray = imageType && /hand|finger|wrist|extremity/i.test(imageType);

        let prompt;
        if (isHandXray) {
          prompt = hf.buildFractureAnalysisPrompt({
            region_focus: patientContext?.region_focus || 'middle_finger',
            image_type: imageType || 'hand_xray',
            is_cropped: !!patientContext?.is_cropped,
            patient: patientContext || {},
          });
        } else {
          prompt = `${CLINICAL_SYSTEM_PROMPT}

Analyze this chest X-ray image. Provide a structured radiology report for the consulting physician.

${RADIOLOGY_JSON_TEMPLATE}`;
        }

        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 1024 });

        if (isHandXray) {
          const parsed = hf.parseFractureResponse(result.generated_text);
          return { ...parsed, mock: false };
        }

        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ X-ray analysis failed: ${err.message}`);
      }
    }

    return {
      findings: [
        { region: 'Lungs', observation: 'Clear bilateral lung fields, no focal consolidation', severity: 'normal' },
        { region: 'Heart', observation: 'Cardiothoracic ratio within normal limits', severity: 'normal' },
        { region: 'Costophrenic angles', observation: 'Sharp bilaterally', severity: 'normal' },
        { region: 'Mediastinum', observation: 'Trachea midline, no mediastinal widening', severity: 'normal' },
      ],
      impression: 'Normal chest radiograph. No acute cardiopulmonary abnormality.',
      comparison: 'No prior studies available',
      technique: 'PA and lateral chest radiograph',
      clinicalCorrelation: 'Correlate with clinical symptoms if persistent respiratory complaints',
      redFlags: [],
      confidence: 0.87,
      mock: true,
    };
  }
}

module.exports = XRayAnalyzer;
