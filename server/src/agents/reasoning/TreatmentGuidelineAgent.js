// ──────────────────────────────────────────────────────────
// Agent #15 — Treatment Guideline Agent
// Model: google/txgemma-27b-chat
// Layer: Clinical Reasoning
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class TreatmentGuidelineAgent extends BaseAgent {
  constructor() {
    super({
      id: 'treatment-guideline',
      name: 'Treatment Guideline Agent',
      number: 15,
      layer: 'Clinical Reasoning',
      layerNumber: 3,
      modelId: 'google/txgemma-27b-chat',
      modelName: 'TxGemma 27B',
      task: 'text-generation',
      description: 'Provides evidence-based treatment guidelines aligned with clinical standards',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const dx = input['differential-diagnosis'] || {};
    const ctx = input.patientContext || {};

    if (hf.isConfigured()) {
      try {
        const prompt = `Provide evidence-based treatment guidelines for: ${dx.primaryDiagnosis || ctx.condition || 'general assessment'}
Patient context: ${ctx.age || 'N/A'}/${ctx.gender || 'N/A'}, comorbidities: ${ctx.condition || 'none'}
Return JSON: {"diagnosis": "", "guidelines": [{"source": "ADA|AHA|WHO|NICE", "recommendation": "", "evidenceLevel": "A|B|C"}], "pharmacotherapy": [{"drug": "", "dose": "", "rationale": ""}], "lifestyle": [], "monitoring": [], "redFlags": []}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 1024 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Guideline generation failed: ${err.message}`);
      }
    }

    return {
      diagnosis: dx.primaryDiagnosis || 'Type 2 Diabetes Mellitus',
      guidelines: [
        { source: 'ADA 2026', recommendation: 'HbA1c target < 7% for most adults', evidenceLevel: 'A' },
        { source: 'KDIGO', recommendation: 'SGLT2 inhibitors for CKD with DM', evidenceLevel: 'A' },
        { source: 'AHA/ACC', recommendation: 'Statin therapy for diabetic patients > 40', evidenceLevel: 'A' },
      ],
      pharmacotherapy: [
        { drug: 'Empagliflozin 10mg', dose: 'Once daily', rationale: 'Renal and cardiac protection in T2DM' },
        { drug: 'Atorvastatin 20mg', dose: 'Once daily at bedtime', rationale: 'CV risk reduction' },
      ],
      lifestyle: ['Mediterranean diet', '150 min/week moderate activity', 'Weight loss 5-7%', 'Smoking cessation'],
      monitoring: ['HbA1c every 3 months', 'eGFR/uACR every 6 months', 'Annual eye exam', 'Foot exam each visit'],
      redFlags: ['Rapid GFR decline > 5 mL/min/year', 'New proteinuria', 'Hypoglycemia episodes'],
      mock: true,
    };
  }
}

module.exports = TreatmentGuidelineAgent;
