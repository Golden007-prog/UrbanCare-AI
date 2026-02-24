// ──────────────────────────────────────────────────────────
// Agent #26 — Risk Escalation Agent
// Model: google/txgemma-9b-predict
// Layer: Monitoring & Alert
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class RiskEscalationAgent extends BaseAgent {
  constructor() {
    super({
      id: 'risk-escalation',
      name: 'Risk Escalation Agent',
      number: 26,
      layer: 'Monitoring & Alert',
      layerNumber: 6,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Escalates risk alerts to attending physicians with structured notifications',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, _options) {
    const alerts = input['alert-generator'] || {};
    const vitals = input['realtime-vitals-monitor'] || {};
    const risk = input['clinical-risk-predictor'] || {};

    const criticalAlerts = (alerts.alerts || []).filter(a => a.severity === 'critical');
    const needsEscalation = criticalAlerts.length > 0 || vitals.ewsScore >= 5 || risk.overallRisk === 'critical';

    return {
      escalationRequired: needsEscalation,
      escalationLevel: criticalAlerts.length > 1 ? 'CODE' : needsEscalation ? 'URGENT' : 'ROUTINE',
      notifyList: needsEscalation
        ? ['Attending Physician', 'Charge Nurse', 'On-call Senior Resident']
        : ['Nurse on duty'],
      escalationMessage: needsEscalation
        ? `⚠️ URGENT: ${criticalAlerts.length} critical alert(s) detected. EWS: ${vitals.ewsScore || 'N/A'}. Immediate physician review required.`
        : 'No immediate escalation needed. Continue routine monitoring.',
      criticalAlerts,
      suggestedActions: needsEscalation
        ? ['Bedside assessment within 15 minutes', 'Prepare for potential transfer to higher care', 'Document escalation in chart']
        : ['Continue scheduled monitoring', 'Review at next rounds'],
      escalationTimestamp: new Date().toISOString(),
      mock: true,
    };
  }
}

module.exports = RiskEscalationAgent;
