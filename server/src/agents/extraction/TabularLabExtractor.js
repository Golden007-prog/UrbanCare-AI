// ──────────────────────────────────────────────────────────
// Agent #4 — Tabular Lab Extractor
// Model: google/medgemma-4b-it (vision-text)
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class TabularLabExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'tabular-lab-extractor',
      name: 'Tabular Lab Extractor',
      number: 4,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Extracts structured lab data (tests, values, units, ranges) from report images',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `Extract all lab test results from this medical report image. Return a JSON array with objects containing: {"test": "<name>", "value": "<value>", "unit": "<unit>", "referenceRange": "<range>", "status": "normal|high|low|critical"}`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 1024 });
        const parsed = JSON.parse(result.generated_text.match(/\[.*\]/s)?.[0] || '[]');
        return { labs: parsed, count: parsed.length, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Lab extraction failed: ${err.message}`);
      }
    }

    return {
      labs: [
        { test: 'Hemoglobin', value: '12.5', unit: 'g/dL', referenceRange: '12.0-16.0', status: 'normal' },
        { test: 'WBC', value: '11200', unit: '/μL', referenceRange: '4000-11000', status: 'high' },
        { test: 'Platelets', value: '245000', unit: '/μL', referenceRange: '150000-400000', status: 'normal' },
        { test: 'Creatinine', value: '1.8', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'high' },
        { test: 'Blood Glucose (Fasting)', value: '142', unit: 'mg/dL', referenceRange: '70-100', status: 'high' },
        { test: 'HbA1c', value: '7.2', unit: '%', referenceRange: '<5.7', status: 'high' },
      ],
      count: 6,
      mock: true,
    };
  }
}

module.exports = TabularLabExtractor;
