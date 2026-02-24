// ──────────────────────────────────────────────────────────
// Agent #25 — Alert Generator
// Model: google/txgemma-9b-predict
// Layer: Monitoring & Alert
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class AlertGenerator extends BaseAgent {
  constructor() {
    super({
      id: 'alert-generator',
      name: 'Alert Generator',
      number: 25,
      layer: 'Monitoring & Alert',
      layerNumber: 6,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Generates structured clinical alerts from anomalies detected by monitoring agents',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const vitalsResult = input['realtime-vitals-monitor'] || {};
    const riskResult = input['clinical-risk-predictor'] || {};
    const labDeviations = input['lab-deviation-analyzer']?.deviations || [];

    const alerts = [];

    // Generate alerts from vital sign anomalies
    for (const check of (vitalsResult.alerts || [])) {
      alerts.push({
        id: `ALT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'vital_sign',
        severity: check.severity,
        title: `${check.status.charAt(0).toUpperCase() + check.status.slice(1)} Detected`,
        description: `${check.vital}: ${check.value} — ${check.status}`,
        action: check.severity === 'critical' ? 'Immediate review required' : 'Monitor closely',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Generate alerts from lab deviations
    for (const dev of labDeviations.filter(d => d.severity === 'severe')) {
      alerts.push({
        id: `ALT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'lab_critical',
        severity: 'critical',
        title: `Critical Lab Value: ${dev.test}`,
        description: dev.interpretation,
        action: 'Notify attending physician immediately',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Risk-based alert
    if (riskResult.overallRisk === 'high' || riskResult.overallRisk === 'critical') {
      alerts.push({
        id: `ALT-${Date.now().toString(36)}-RISK`,
        type: 'risk_elevation',
        severity: riskResult.overallRisk === 'critical' ? 'critical' : 'warning',
        title: 'Elevated Clinical Risk Score',
        description: `Overall risk: ${riskResult.overallRisk}. EWS: ${vitalsResult.ewsScore || 'N/A'}`,
        action: 'Clinical team review recommended',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
    }

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical').length,
      warningCount: alerts.filter(a => a.severity === 'warning').length,
      mock: true,
    };
  }
}

module.exports = AlertGenerator;
