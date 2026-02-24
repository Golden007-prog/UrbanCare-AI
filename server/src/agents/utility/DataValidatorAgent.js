// ──────────────────────────────────────────────────────────
// Agent #30 — Data Validator Agent
// Model: google/txgemma-2b-predict
// Layer: Utility
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class DataValidatorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'data-validator',
      name: 'Data Validator Agent',
      number: 30,
      layer: 'Utility',
      layerNumber: 8,
      modelId: 'google/txgemma-2b-predict',
      modelName: 'TxGemma 2B',
      task: 'text-generation',
      description: 'Validates clinical data integrity, checks for PHI compliance and data consistency',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, _options) {
    const checks = [];
    let passCount = 0;
    let failCount = 0;

    // Check patient context completeness
    const ctx = input.patientContext || {};
    const requiredPatientFields = ['name', 'age', 'gender', 'condition'];
    for (const field of requiredPatientFields) {
      const present = !!ctx[field];
      checks.push({ check: `Patient ${field}`, status: present ? 'pass' : 'missing', critical: field === 'name' });
      present ? passCount++ : failCount++;
    }

    // Check agent pipeline completion
    const expectedAgents = [
      'report-page-classifier', 'patient-type-classifier',
      'tabular-lab-extractor', 'lab-deviation-analyzer',
      'differential-diagnosis', 'soap-generator',
      'clinical-risk-predictor', 'realtime-vitals-monitor',
    ];
    for (const agentId of expectedAgents) {
      const present = !!input[agentId];
      checks.push({ check: `Agent output: ${agentId}`, status: present ? 'pass' : 'missing', critical: false });
      present ? passCount++ : failCount++;
    }

    // PHI safety check
    const phiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/, /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/]; // SSN, credit card
    const jsonStr = JSON.stringify(input);
    for (const pattern of phiPatterns) {
      const found = pattern.test(jsonStr);
      checks.push({ check: 'PHI pattern scan', status: found ? 'warning' : 'pass', critical: true });
      found ? failCount++ : passCount++;
    }

    return {
      overallStatus: failCount === 0 ? 'valid' : failCount > 3 ? 'invalid' : 'partial',
      totalChecks: checks.length,
      passed: passCount,
      failed: failCount,
      checks,
      dataIntegrity: passCount / (passCount + failCount),
      timestamp: new Date().toISOString(),
      mock: true,
    };
  }
}

module.exports = DataValidatorAgent;
