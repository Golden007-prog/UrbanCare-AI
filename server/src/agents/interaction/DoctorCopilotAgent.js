// ──────────────────────────────────────────────────────────
// Agent #27 — Doctor Copilot Agent
// Model: Gemini Pro
// Layer: Interaction
// Modes: consultant | soap | escalation
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const { consultChat } = require('../../ai/consultModel');

class DoctorCopilotAgent extends BaseAgent {
  constructor() {
    super({
      id: 'doctor-copilot',
      name: 'Doctor Copilot Agent',
      number: 27,
      layer: 'Interaction',
      layerNumber: 7,
      modelId: 'gemini-pro',
      modelName: 'Gemini Pro',
      task: 'conversational-ai',
      description: 'Full clinical copilot with consultant, SOAP, and escalation modes',
    });
  }

  async process(input, _options) {
    const { message, history, patientContext, language, action, mode } = input;

    // This agent delegates to the existing Gemini consultModel
    if (message || action) {
      try {
        const result = await consultChat({
          message: message || '',
          history: history || [],
          patientContext: patientContext || {},
          language: language || 'en',
          action,
          mode: mode || 'consultant',
        });
        return { ...result, agentMode: mode || 'consultant', mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Copilot error: ${err.message}`);
      }
    }

    return {
      response: 'I\'m your AI clinical copilot. I can help with SOAP notes, differential diagnosis, treatment guidelines, and risk assessments. What would you like to discuss?',
      agentMode: mode || 'consultant',
      availableModes: ['consultant', 'soap', 'escalation'],
      availableActions: ['generate-soap', 'risk-assessment', 'differential-diagnosis', 'referral-letter', 'discharge-summary', 'follow-up-plan'],
      mock: true,
    };
  }
}

module.exports = DoctorCopilotAgent;
