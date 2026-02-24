// ──────────────────────────────────────────────────────────
// Agent #20 — Smart Intake Agent
// Model: Gemini API
// Layer: Patient Workflow
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class SmartIntakeAgent extends BaseAgent {
  constructor() {
    super({
      id: 'smart-intake',
      name: 'Smart Intake Agent',
      number: 20,
      layer: 'Patient Workflow',
      layerNumber: 5,
      modelId: 'gemini-pro',
      modelName: 'Gemini Pro',
      task: 'text-generation',
      description: 'Handles intelligent patient intake with dynamic questioning via Gemini API',
    });
  }

  async process(input, _options) {
    const { patientContext, symptoms, chiefComplaint } = input;

    // Gemini API call would go here for production
    return {
      intakeForm: {
        chiefComplaint: chiefComplaint || patientContext?.condition || 'General check-up',
        symptoms: symptoms || ['Fatigue', 'Increased thirst', 'Frequent urination'],
        duration: '2 weeks',
        severity: 'moderate',
        associatedSymptoms: ['Mild blurred vision', 'Weight loss (3 kg in 1 month)'],
        aggravatingFactors: ['After meals', 'During stress'],
        relievingFactors: ['Rest', 'Hydration'],
      },
      triagePriority: 'P2 — Semi-urgent',
      suggestedSpecialty: 'Internal Medicine / Endocrinology',
      followUpQuestions: [
        'Have you experienced any numbness or tingling in your extremities?',
        'Do you have a family history of diabetes?',
        'When was your last eye examination?',
      ],
      mock: true,
    };
  }
}

module.exports = SmartIntakeAgent;
