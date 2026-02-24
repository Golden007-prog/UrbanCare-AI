// ──────────────────────────────────────────────────────────
// Agent #5 — Lab Deviation Analyzer
// Model: google/txgemma-9b-predict
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class LabDeviationAnalyzer extends BaseAgent {
  constructor() {
    super({
      id: 'lab-deviation-analyzer',
      name: 'Lab Deviation Analyzer',
      number: 5,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/txgemma-9b-predict',
      modelName: 'TxGemma 9B',
      task: 'text-generation',
      description: 'Analyzes lab values for clinical deviations and flags abnormalities',
      offlineModelId: 'google/txgemma-2b-predict',
    });
  }

  async process(input, options) {
    const labs = input['tabular-lab-extractor']?.labs || input.labs || [];
    const labText = labs.map(l => `${l.test}: ${l.value} ${l.unit} (ref: ${l.referenceRange})`).join('\n');

    if (labText && hf.isConfigured()) {
      try {
        const prompt = `Analyze these lab results for clinically significant deviations:\n\n${labText}\n\nRespond with JSON: {"deviations": [{"test": "<name>", "severity": "mild|moderate|severe", "interpretation": "<text>"}], "overallRisk": "low|medium|high", "summary": "<text>"}`;
        const result = await hf.textGeneration(options.modelId, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Deviation analysis failed: ${err.message}`);
      }
    }

    const abnormal = labs.filter(l => l.status !== 'normal');
    return {
      deviations: abnormal.map(l => ({
        test: l.test,
        severity: l.status === 'critical' ? 'severe' : 'moderate',
        interpretation: `${l.test} is ${l.status} at ${l.value} ${l.unit} (normal: ${l.referenceRange})`,
      })),
      overallRisk: abnormal.length > 2 ? 'high' : abnormal.length > 0 ? 'medium' : 'low',
      summary: `${abnormal.length} of ${labs.length} tests show deviations from normal ranges.`,
      mock: true,
    };
  }
}

module.exports = LabDeviationAnalyzer;
