// ──────────────────────────────────────────────────────────
// Agent #24 — Real-Time Vitals Monitor
// Model: Rule-based + google/txgemma-2b-predict
// Layer: Monitoring & Alert
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class RealTimeVitalsMonitor extends BaseAgent {
  constructor() {
    super({
      id: 'realtime-vitals-monitor',
      name: 'Real-Time Vitals Monitor',
      number: 24,
      layer: 'Monitoring & Alert',
      layerNumber: 6,
      modelId: 'google/txgemma-2b-predict',
      modelName: 'Rule-Based + TxGemma 2B',
      task: 'monitoring',
      description: 'Monitors patient vitals in real-time using rule-based thresholds + AI anomaly detection',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, _options) {
    const vitals = input.patientContext?.vitals || input.vitals || {};

    // Rule-based vital sign analysis
    const checks = [];
    const hr = parseFloat(vitals.hr || vitals.heartRate || 75);
    const sbp = parseFloat((vitals.bp || '120/80').split('/')[0]);
    const dbp = parseFloat((vitals.bp || '120/80').split('/')[1]);
    const temp = parseFloat(vitals.temp || vitals.temperature || 98.6);
    const spo2 = parseFloat(vitals.spo2 || vitals.oxygenSaturation || 98);
    const rr = parseFloat(vitals.rr || vitals.respiratoryRate || 16);

    if (hr > 100) checks.push({ vital: 'Heart Rate', value: hr, status: 'tachycardia', severity: hr > 120 ? 'critical' : 'warning' });
    if (hr < 60) checks.push({ vital: 'Heart Rate', value: hr, status: 'bradycardia', severity: hr < 45 ? 'critical' : 'warning' });
    if (sbp > 140) checks.push({ vital: 'Systolic BP', value: sbp, status: 'hypertension', severity: sbp > 180 ? 'critical' : 'warning' });
    if (sbp < 90) checks.push({ vital: 'Systolic BP', value: sbp, status: 'hypotension', severity: sbp < 80 ? 'critical' : 'warning' });
    if (temp > 100.4) checks.push({ vital: 'Temperature', value: temp, status: 'fever', severity: temp > 103 ? 'critical' : 'warning' });
    if (spo2 < 95) checks.push({ vital: 'SpO2', value: spo2, status: 'hypoxia', severity: spo2 < 90 ? 'critical' : 'warning' });
    if (rr > 20) checks.push({ vital: 'Resp. Rate', value: rr, status: 'tachypnea', severity: rr > 30 ? 'critical' : 'warning' });

    // Calculate Early Warning Score (NEWS2-inspired)
    let ewsScore = 0;
    if (hr > 110 || hr < 50) ewsScore += 3;
    else if (hr > 100 || hr < 60) ewsScore += 1;
    if (sbp < 90 || sbp > 180) ewsScore += 3;
    else if (sbp < 100 || sbp > 140) ewsScore += 1;
    if (spo2 < 92) ewsScore += 3;
    else if (spo2 < 95) ewsScore += 1;
    if (temp > 103 || temp < 95) ewsScore += 3;
    else if (temp > 100.4) ewsScore += 1;

    return {
      vitals: { heartRate: hr, systolicBP: sbp, diastolicBP: dbp, temperature: temp, spo2, respiratoryRate: rr },
      alerts: checks,
      ewsScore,
      riskLevel: ewsScore >= 7 ? 'critical' : ewsScore >= 5 ? 'high' : ewsScore >= 3 ? 'medium' : 'low',
      recommendation: ewsScore >= 7 ? 'Immediate medical review required' : ewsScore >= 5 ? 'Urgent review within 30 minutes' : 'Continue routine monitoring',
      lastChecked: new Date().toISOString(),
      mock: !vitals.hr,
    };
  }
}

module.exports = RealTimeVitalsMonitor;
