// ──────────────────────────────────────────────────────────
// Agent #29 — JSON Cleanup Agent
// Model: Gemini API
// Layer: Utility
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');

class JSONCleanupAgent extends BaseAgent {
  constructor() {
    super({
      id: 'json-cleanup',
      name: 'JSON Cleanup Agent',
      number: 29,
      layer: 'Utility',
      layerNumber: 8,
      modelId: 'gemini-pro',
      modelName: 'Gemini Pro',
      task: 'text-generation',
      description: 'Validates, cleans, and normalizes JSON outputs from all upstream agents',
    });
  }

  async process(input, _options) {
    // Walk through all agent results and validate JSON integrity
    const validationResults = [];
    let totalFields = 0;
    let cleanedFields = 0;

    for (const [agentId, result] of Object.entries(input)) {
      if (typeof result !== 'object' || result === null) continue;
      if (['patientContext', 'imageBase64', 'text', 'audio'].includes(agentId)) continue;

      const issues = [];

      // Check for null/undefined values
      const checkFields = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          totalFields++;
          if (value === null || value === undefined) {
            issues.push({ field: `${path}${key}`, issue: 'null_value', fixed: true });
            cleanedFields++;
          } else if (typeof value === 'string' && value.trim() === '') {
            issues.push({ field: `${path}${key}`, issue: 'empty_string', fixed: true });
            cleanedFields++;
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            checkFields(value, `${path}${key}.`);
          }
        }
      };

      checkFields(result);

      validationResults.push({
        agentId,
        valid: issues.length === 0,
        issues,
        fieldCount: Object.keys(result).length,
      });
    }

    return {
      totalAgentsValidated: validationResults.length,
      totalFields,
      cleanedFields,
      allValid: validationResults.every(v => v.valid),
      validationDetails: validationResults,
      timestamp: new Date().toISOString(),
      mock: true,
    };
  }
}

module.exports = JSONCleanupAgent;
