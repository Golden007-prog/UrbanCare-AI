// ──────────────────────────────────────────────────────────
// Agent #9 — Medication Extractor
// Model: google/medgemma-4b-it
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class MedicationExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'medication-extractor',
      name: 'Medication Extractor',
      number: 9,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Extracts medication names, dosages, routes, and instructions from prescriptions',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `Extract all medications from this prescription image. Return JSON array: [{"name": "", "dosage": "", "route": "oral|iv|im|topical", "frequency": "", "duration": "", "instructions": ""}]`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\[.*\]/s)?.[0] || '[]');
        return { medications: parsed, count: parsed.length, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Medication extraction failed: ${err.message}`);
      }
    }

    return {
      medications: [
        { name: 'Metformin', dosage: '500mg', route: 'oral', frequency: 'Twice daily', duration: 'Ongoing', instructions: 'Take with meals' },
        { name: 'Amlodipine', dosage: '5mg', route: 'oral', frequency: 'Once daily', duration: 'Ongoing', instructions: 'Take in morning' },
        { name: 'Aspirin', dosage: '75mg', route: 'oral', frequency: 'Once daily', duration: 'Ongoing', instructions: 'After lunch' },
        { name: 'Pantoprazole', dosage: '40mg', route: 'oral', frequency: 'Once daily', duration: '14 days', instructions: 'Before breakfast' },
      ],
      count: 4,
      mock: true,
    };
  }
}

module.exports = MedicationExtractor;
