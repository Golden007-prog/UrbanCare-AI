// ──────────────────────────────────────────────────────────
// Agent #14 — Clinical Risk Predictor
// Model: google/txgemma-9b-predict
// Layer: Clinical Reasoning
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class ClinicalRiskPredictor extends BaseAgent {
  constructor() {
    super({
      id: 'clinical-risk-predictor',
      name: 'Clinical Risk Predictor',
      number: 14,
      layer: 'Clinical Reasoning',
      layerNumber: 3,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Predicts clinical risk scores (sepsis, cardiac, readmission, mortality)',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const ctx = input.patientContext || {};
    const vitals = ctx.vitals || {};
    const labs = input['tabular-lab-extractor']?.labs || [];

    if (hf.isConfigured()) {
      try {
        const prompt = `Calculate clinical risk scores for this patient:
Age: ${ctx.age || 'N/A'}, Vitals: ${JSON.stringify(vitals)}, Labs: ${labs.map(l => `${l.test}:${l.value}`).join(',')}
Return JSON: {"sepsisRisk": <0-100>, "cardiacRisk": <0-100>, "readmissionRisk": <0-100>, "overallRisk": "low|medium|high|critical", "riskFactors": [], "recommendations": []}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Risk prediction failed: ${err.message}`);
      }
    }

    return {
      sepsisRisk: 18,
      cardiacRisk: 35,
      readmissionRisk: 28,
      mortalityRisk: 8,
      overallRisk: 'medium',
      riskFactors: ['Uncontrolled diabetes', 'Elevated creatinine', 'Age > 40', 'Hypertension'],
      recommendations: ['Optimize glycemic control', 'Renal protective strategies', 'Cardiology assessment'],
      ewsScore: 3,
      mock: true,
    };
  }
}

module.exports = ClinicalRiskPredictor;
