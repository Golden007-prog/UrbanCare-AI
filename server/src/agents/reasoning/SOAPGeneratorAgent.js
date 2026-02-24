// ──────────────────────────────────────────────────────────
// Agent #12 — SOAP Generator Agent
// Model: google/txgemma-27b-chat  |  Offline: txgemma-2b-predict
// Layer: Clinical Reasoning
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class SOAPGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'soap-generator',
      name: 'SOAP Generator Agent',
      number: 12,
      layer: 'Clinical Reasoning',
      layerNumber: 3,
      modelId: 'google/txgemma-27b-chat',
      modelName: 'TxGemma 27B',
      task: 'text-generation',
      description: 'Generates structured SOAP notes from patient data and clinical findings',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const ctx = input.patientContext || {};
    const dx = input['differential-diagnosis'] || {};
    const history = input['patient-history-extractor'] || {};
    const labs = input['tabular-lab-extractor']?.labs || [];

    if (hf.isConfigured()) {
      try {
        const prompt = `Generate a comprehensive SOAP note for this patient:

Patient: ${ctx.name || 'N/A'}, Age: ${ctx.age || 'N/A'}, Gender: ${ctx.gender || 'N/A'}
Chief Complaint: ${ctx.condition || 'N/A'}
Medical History: ${(history.pastMedical || []).join(', ')}
Current Medications: ${(history.currentMedications || []).join(', ')}
Lab Results: ${labs.map(l => `${l.test}: ${l.value} ${l.unit}`).join(', ')}
Working Diagnosis: ${dx.primaryDiagnosis || 'Pending'}

Return JSON: {"subjective": "", "objective": "", "assessment": "", "plan": ""}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 1024 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ SOAP generation failed: ${err.message}`);
      }
    }

    return {
      subjective: `${ctx.name || 'Patient'}, ${ctx.age || 'N/A'}/${ctx.gender || 'N/A'}, presents with ${ctx.condition || 'multiple complaints'}. Reports fatigue and increased thirst. PMH: ${(history.pastMedical || ['DM', 'HTN']).join(', ')}.`,
      objective: `Vitals: BP ${ctx.vitals?.bp || '140/90'}, HR ${ctx.vitals?.hr || '82'}, Temp ${ctx.vitals?.temp || '98.6°F'}. Labs: ${labs.map(l => `${l.test} ${l.value}`).join(', ')}. Alert and oriented.`,
      assessment: `1. ${dx.primaryDiagnosis || 'Uncontrolled DM'}\n2. Hypertension — controlled\n3. Elevated creatinine — monitor renal function`,
      plan: `1. Adjust Metformin dosage\n2. Add Glimepiride 1mg OD\n3. Renal function panel in 2 weeks\n4. Ophthalmology referral\n5. Follow up in 4 weeks`,
      mock: true,
    };
  }
}

module.exports = SOAPGeneratorAgent;
