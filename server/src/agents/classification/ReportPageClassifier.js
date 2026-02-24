// ──────────────────────────────────────────────────────────
// Agent #1 — Report Page Classifier
// Model: google/medgemma-4b-it
// Layer: Classification
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class ReportPageClassifier extends BaseAgent {
  constructor() {
    super({
      id: 'report-page-classifier',
      name: 'Report Page Classifier',
      number: 1,
      layer: 'Classification',
      layerNumber: 1,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Classifies uploaded documents as lab report, bill, prescription, or discharge summary',
    });
  }

  async process(input, options) {
    const { imageBase64, text } = input;
    const CATEGORIES = ['lab_report', 'bill', 'prescription', 'discharge_summary', 'radiology_report', 'unknown'];

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `You are a medical document classifier. Classify this document image into exactly one of these categories: ${CATEGORIES.join(', ')}.\n\nRespond with ONLY a JSON object: {"category": "<category>", "confidence": <0-1>}`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 100 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { category: parsed.category || 'unknown', confidence: parsed.confidence || 0.5, model: options.modelId, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ HF inference failed, using rule-based: ${err.message}`);
      }
    }

    // Rule-based fallback
    const lowerText = (text || '').toLowerCase();
    if (/hemoglobin|wbc|rbc|platelet|glucose|creatinine|cholesterol/i.test(lowerText)) return { category: 'lab_report', confidence: 0.85, mock: true };
    if (/total.*amount|bill|invoice|pharmacy|receipt/i.test(lowerText)) return { category: 'bill', confidence: 0.82, mock: true };
    if (/tablet|capsule|syrup|mg.*daily|prescription|rx/i.test(lowerText)) return { category: 'prescription', confidence: 0.80, mock: true };
    if (/discharge|admitted|discharged|hospital course/i.test(lowerText)) return { category: 'discharge_summary', confidence: 0.83, mock: true };
    if (/x-ray|ct scan|mri|radiology|impression/i.test(lowerText)) return { category: 'radiology_report', confidence: 0.81, mock: true };
    return { category: 'unknown', confidence: 0.3, mock: true };
  }
}

module.exports = ReportPageClassifier;
