// ──────────────────────────────────────────────────────────
// Agent #3 — Patient Type Classifier
// Model: google/txgemma-2b-predict
// Layer: Classification
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class PatientTypeClassifier extends BaseAgent {
  constructor() {
    super({
      id: 'patient-type-classifier',
      name: 'Patient Type Classifier',
      number: 3,
      layer: 'Classification',
      layerNumber: 1,
      modelId: 'google/txgemma-2b-predict',
      modelName: 'TxGemma 2B',
      task: 'text-generation',
      description: 'Classifies patient as admitted, emergency, or outpatient based on clinical context',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const { text, patientContext } = input;
    const context = text || JSON.stringify(patientContext || {});
    const TYPES = ['admitted', 'emergency', 'outpatient', 'icu', 'day_care'];

    if (context && hf.isConfigured()) {
      try {
        const prompt = `Classify this patient encounter into one of: ${TYPES.join(', ')}.\n\nPatient context: ${context.substring(0, 500)}\n\nRespond ONLY with JSON: {"patientType": "<type>", "urgency": "low|medium|high|critical", "confidence": <0-1>}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 100 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { patientType: parsed.patientType || 'outpatient', urgency: parsed.urgency || 'medium', confidence: parsed.confidence || 0.5, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ TxGemma classification failed: ${err.message}`);
      }
    }

    // Heuristic fallback
    const lower = context.toLowerCase();
    if (/emergency|critical|trauma|code blue/i.test(lower)) return { patientType: 'emergency', urgency: 'critical', confidence: 0.85, mock: true };
    if (/icu|intensive|ventilator/i.test(lower)) return { patientType: 'icu', urgency: 'high', confidence: 0.83, mock: true };
    if (/admitted|ward|bed/i.test(lower)) return { patientType: 'admitted', urgency: 'medium', confidence: 0.80, mock: true };
    return { patientType: 'outpatient', urgency: 'low', confidence: 0.75, mock: true };
  }
}

module.exports = PatientTypeClassifier;
