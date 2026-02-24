// ──────────────────────────────────────────────────────────
// Agent #21 — Family Dashboard Agent
// Model: Gemini API
// Layer: Patient Workflow
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class FamilyDashboardAgent extends BaseAgent {
  constructor() {
    super({
      id: 'family-dashboard',
      name: 'Family Dashboard Agent',
      number: 21,
      layer: 'Patient Workflow',
      layerNumber: 5,
      modelId: 'gemini-pro',
      modelName: 'Gemini Pro',
      task: 'text-generation',
      description: 'Generates simplified patient status explanations for family members',
    });
  }

  async process(input, _options) {
    const ctx = input.patientContext || {};
    const dx = input['differential-diagnosis'] || {};
    const risk = input['clinical-risk-predictor'] || {};

    return {
      patientName: ctx.name || 'Your family member',
      statusSummary: `${ctx.name || 'The patient'} is currently ${ctx.admissionStatus || 'under observation'} and receiving appropriate care.`,
      conditionExplanation: `The medical team is managing ${dx.primaryDiagnosis || ctx.condition || 'the current condition'} with a comprehensive treatment plan.`,
      currentStatus: {
        overall: risk.overallRisk === 'high' ? 'Needs close monitoring' : 'Stable',
        mood: 'Comfortable',
        lastCheckup: new Date().toISOString(),
        nextCheckup: 'In 4 hours',
      },
      safeToShare: [
        'Vitals are being monitored regularly',
        'Medications are being given on schedule',
        'The care team is managing the condition actively',
      ],
      avoidSharing: ['Raw lab values without context', 'Differential diagnosis list'],
      familyActions: ['Bring comfortable clothing', 'Ensure medication list from home is provided', 'Note any changes in symptoms'],
      mock: true,
    };
  }
}

module.exports = FamilyDashboardAgent;
