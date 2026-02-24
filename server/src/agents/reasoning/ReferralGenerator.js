// ──────────────────────────────────────────────────────────
// Agent #13 — Referral Generator
// Model: google/txgemma-9b-predict
// Layer: Clinical Reasoning
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class ReferralGenerator extends BaseAgent {
  constructor() {
    super({
      id: 'referral-generator',
      name: 'Referral Generator',
      number: 13,
      layer: 'Clinical Reasoning',
      layerNumber: 3,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Generates specialist referral letters based on clinical findings',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const ctx = input.patientContext || {};
    const dx = input['differential-diagnosis'] || {};

    if (hf.isConfigured()) {
      try {
        const prompt = `Generate a specialist referral letter for:
Patient: ${ctx.name || 'N/A'}, ${ctx.age || 'N/A'}/${ctx.gender || 'N/A'}
Diagnosis: ${dx.primaryDiagnosis || ctx.condition || 'N/A'}
Referring Doctor: Dr. ${ctx.doctor || 'Attending'}
Return JSON: {"referralTo": "", "urgency": "", "reason": "", "clinicalSummary": "", "requestedEvaluation": "", "letterBody": ""}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Referral generation failed: ${err.message}`);
      }
    }

    return {
      referralTo: 'Nephrology',
      urgency: 'Semi-urgent',
      reason: 'Elevated creatinine with uncontrolled diabetes — evaluate for diabetic nephropathy',
      clinicalSummary: `${ctx.age || '45'}/${ctx.gender || 'M'} with ${dx.primaryDiagnosis || 'T2DM'}, Cr 1.8 mg/dL, HbA1c 7.2%`,
      requestedEvaluation: 'Renal function assessment, GFR estimation, possible renal biopsy',
      letterBody: `Dear Colleague,\n\nI am referring ${ctx.name || 'this patient'} for nephrology evaluation due to persistent elevation of serum creatinine in the setting of uncontrolled Type 2 Diabetes.\n\nPlease evaluate and advise on further management.\n\nThank you.`,
      mock: true,
    };
  }
}

module.exports = ReferralGenerator;
