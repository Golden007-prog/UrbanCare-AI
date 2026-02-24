// ──────────────────────────────────────────────────────────
// Agent #8 — Patient History Extractor
// Model: google/txgemma-9b-predict
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class PatientHistoryExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'patient-history-extractor',
      name: 'Patient History Extractor',
      number: 8,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Extracts and structures patient medical history from clinical notes',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const text = input.text || input.patientContext?.history || '';

    if (text && hf.isConfigured()) {
      try {
        const prompt = `Extract structured medical history from the following clinical text:\n\n${text.substring(0, 1000)}\n\nReturn JSON: {"pastMedical": [], "surgical": [], "allergies": [], "familyHistory": [], "socialHistory": {"smoking": "", "alcohol": "", "exercise": ""}, "currentMedications": []}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ History extraction failed: ${err.message}`);
      }
    }

    return {
      pastMedical: ['Type 2 Diabetes (diagnosed 2020)', 'Hypertension (diagnosed 2018)', 'Mild Asthma'],
      surgical: ['Appendectomy (2015)'],
      allergies: ['Penicillin — causes rash', 'Sulfa drugs'],
      familyHistory: ['Father — MI at age 55', 'Mother — Type 2 DM'],
      socialHistory: { smoking: 'Never', alcohol: 'Occasional', exercise: '2-3 times per week' },
      currentMedications: ['Metformin 500mg BD', 'Amlodipine 5mg OD', 'Aspirin 75mg OD'],
      mock: true,
    };
  }
}

module.exports = PatientHistoryExtractor;
