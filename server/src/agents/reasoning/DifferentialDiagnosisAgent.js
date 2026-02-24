// ──────────────────────────────────────────────────────────
// Agent #11 — Differential Diagnosis Agent
// Model: google/medgemma-4b-it
// Layer: Clinical Reasoning
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class DifferentialDiagnosisAgent extends BaseAgent {
  constructor() {
    super({
      id: 'differential-diagnosis',
      name: 'Differential Diagnosis Agent',
      number: 11,
      layer: 'Clinical Reasoning',
      layerNumber: 3,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 27B',
      task: 'image-text-to-text',
      description: 'Generates ranked differential diagnoses from symptoms, labs, and imaging',
      offlineModelId: 'google/medgemma-4b-it',
    });
  }

  async process(input, options) {
    const { patientContext, imageBase64 } = input;
    const labs = input['tabular-lab-extractor']?.labs || [];
    const deviations = input['lab-deviation-analyzer']?.deviations || [];
    const history = input['patient-history-extractor'] || {};

    const clinicalContext = `Patient: ${patientContext?.name || 'Unknown'}, Age: ${patientContext?.age || 'N/A'}, Gender: ${patientContext?.gender || 'N/A'}
Condition: ${patientContext?.condition || 'N/A'}
Lab findings: ${deviations.map(d => d.interpretation).join('; ')}
History: ${(history.pastMedical || []).join(', ')}`;

    if (hf.isConfigured()) {
      try {
        const prompt = `Based on the clinical presentation below, generate a ranked differential diagnosis list.\n\n${clinicalContext}\n\nReturn JSON: {"differentials": [{"diagnosis": "", "probability": "<high|medium|low>", "reasoning": "", "supportingEvidence": [], "suggestedWorkup": []}], "primaryDiagnosis": "", "urgency": "routine|urgent|emergent"}`;

        let result;
        if (imageBase64) {
          result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 1024 });
        } else {
          result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 1024 });
        }
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Differential dx failed: ${err.message}`);
      }
    }

    return {
      differentials: [
        { diagnosis: 'Type 2 Diabetes Mellitus — Uncontrolled', probability: 'high', reasoning: 'Elevated HbA1c and fasting glucose', supportingEvidence: ['HbA1c 7.2%', 'FBG 142 mg/dL'], suggestedWorkup: ['Repeat HbA1c in 3 months', 'Fundoscopy'] },
        { diagnosis: 'Chronic Kidney Disease — Stage 2', probability: 'medium', reasoning: 'Elevated creatinine', supportingEvidence: ['Creatinine 1.8 mg/dL'], suggestedWorkup: ['GFR calculation', 'Renal ultrasound'] },
        { diagnosis: 'Early Sepsis', probability: 'low', reasoning: 'Elevated WBC count', supportingEvidence: ['WBC 11,200/μL'], suggestedWorkup: ['Blood cultures', 'CRP/Procalcitonin'] },
      ],
      primaryDiagnosis: 'Type 2 Diabetes Mellitus — Uncontrolled',
      urgency: 'urgent',
      mock: true,
    };
  }
}

module.exports = DifferentialDiagnosisAgent;
