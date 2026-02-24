// ──────────────────────────────────────────────────────────
// Agent #7 — Patient & Doctor Info Extractor
// Model: google/medgemma-4b-it
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class PatientDoctorInfoExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'patient-doctor-info-extractor',
      name: 'Patient & Doctor Info Extractor',
      number: 7,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Extracts patient demographics and referring doctor info from documents',
    });
  }

  async process(input, options) {
    const { imageBase64, text } = input;

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `Extract patient and doctor information from this medical document. Return JSON: {"patient": {"name": "", "age": 0, "gender": "", "id": "", "phone": "", "address": ""}, "doctor": {"name": "", "specialization": "", "registrationNo": "", "hospital": ""}}`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 300 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Info extraction failed: ${err.message}`);
      }
    }

    return {
      patient: { name: input.patientContext?.name || 'Patient', age: input.patientContext?.age || 45, gender: input.patientContext?.gender || 'M', id: 'PT-2026-001', phone: '+91-XXXXXXXXXX', address: 'Delhi, India' },
      doctor: { name: 'Dr. Sharma', specialization: 'Internal Medicine', registrationNo: 'MCI-12345', hospital: 'UrbanCare Hospital' },
      mock: true,
    };
  }
}

module.exports = PatientDoctorInfoExtractor;
