// ──────────────────────────────────────────────────────────
// Agent #6 — Detailed Report Summary
// Model: google/txgemma-27b-chat
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class DetailedReportSummary extends BaseAgent {
  constructor() {
    super({
      id: 'detailed-report-summary',
      name: 'Detailed Report Summary',
      number: 6,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/txgemma-27b-chat',
      modelName: 'TxGemma 27B',
      task: 'text-generation',
      description: 'Generates comprehensive clinical report summaries from extracted data',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const labs = input['tabular-lab-extractor']?.labs || [];
    const deviations = input['lab-deviation-analyzer']?.deviations || [];
    const patientContext = input.patientContext || {};

    const contextText = `Patient: ${patientContext.name || 'Unknown'}, Age: ${patientContext.age || 'N/A'}, Condition: ${patientContext.condition || 'N/A'}\nLab results: ${labs.length} tests performed\nDeviations: ${deviations.length} abnormal values detected`;

    if (hf.isConfigured()) {
      try {
        const prompt = `Generate a detailed clinical report summary based on the following data:\n\n${contextText}\n\nLab Details:\n${labs.map(l => `- ${l.test}: ${l.value} ${l.unit} [${l.status}]`).join('\n')}\n\nProvide a structured JSON response: {"summary": "<comprehensive summary>", "keyFindings": ["<finding1>", ...], "clinicalImplications": ["<implication1>", ...], "recommendations": ["<rec1>", ...]}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 1024 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Report summary failed: ${err.message}`);
      }
    }

    return {
      summary: `Clinical report for ${patientContext.name || 'the patient'} showing ${labs.length} lab tests with ${deviations.length} significant deviations requiring attention.`,
      keyFindings: deviations.map(d => d.interpretation),
      clinicalImplications: ['Elevated inflammatory markers may indicate ongoing infection', 'Renal function requires monitoring'],
      recommendations: ['Repeat labs in 48 hours', 'Consider specialist referral if values do not improve', 'Monitor fluid intake and output'],
      mock: true,
    };
  }
}

module.exports = DetailedReportSummary;
