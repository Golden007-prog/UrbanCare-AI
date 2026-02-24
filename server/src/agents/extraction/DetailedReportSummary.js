// ──────────────────────────────────────────────────────────
// Agent #6 — Detailed Report Summary
// Model: Gemini 2.5 Flash — for reliable text generation
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const { GoogleGenAI } = require('@google/genai');
const { CLINICAL_SYSTEM_PROMPT } = require('../../config/clinicalSystemPrompt');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class DetailedReportSummary extends BaseAgent {
  constructor() {
    super({
      id: 'detailed-report-summary',
      name: 'Detailed Report Summary',
      number: 6,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'gemini-2.5-flash',
      modelName: 'Gemini 2.5 Flash',
      task: 'text-generation',
      description: 'Generates comprehensive clinical report summaries from extracted data',
    });
  }

  async process(input, options) {
    const labs = input['tabular-lab-extractor']?.labs || [];
    const deviations = input['lab-deviation-analyzer']?.deviations || [];
    const patientContext = input.patientContext || {};

    if (labs.length === 0) {
      return {
        summary: 'No lab data available for summary generation.',
        keyFindings: [],
        clinicalImplications: [],
        recommendations: ['Upload a lab report image for AI-powered analysis'],
        mock: true,
      };
    }

    // Build context
    const labDetails = labs.map(l =>
      `- ${l.test}: ${l.value} ${l.unit} (Ref: ${l.referenceRange || 'N/A'}) [${l.status || 'unknown'}]`
    ).join('\n');

    const abnormalLabs = labs.filter(l => l.status && l.status !== 'normal');

    if (!GEMINI_API_KEY) {
      // Offline fallback — generate basic summary from data
      return {
        summary: `Lab report contains ${labs.length} tests. ${abnormalLabs.length} values are outside normal range.`,
        keyFindings: abnormalLabs.map(l => `${l.test}: ${l.value} ${l.unit} (${l.status})`),
        clinicalImplications: abnormalLabs.length > 0
          ? ['Some values are outside normal range — clinical review recommended']
          : ['All values within normal range'],
        recommendations: ['Review with treating physician'],
        mock: true,
      };
    }

    try {
      console.log('     📝 Generating summary via Gemini...');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const prompt = `${CLINICAL_SYSTEM_PROMPT}

Based on the following lab results, provide a structured clinical summary for the consulting physician.

Lab Results:
${labDetails}

Provide a JSON response with this exact structure:
{
  "summary": "A 2-3 sentence clinical summary of the overall findings using medical terminology",
  "keyFindings": ["finding1", "finding2"],
  "clinicalImplications": ["implication1", "implication2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on clinically significant findings. Use medical terminology. Specify which values are abnormal and their clinical significance. Return ONLY the JSON object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log('     ✅ Summary generated via Gemini');
        return { ...parsed, mock: false };
      }

      return {
        summary: text.slice(0, 500),
        keyFindings: abnormalLabs.map(l => `${l.test}: ${l.value} ${l.unit} (${l.status})`),
        clinicalImplications: [],
        recommendations: [],
        mock: false,
      };
    } catch (err) {
      console.error(`     ❌ Gemini summary failed: ${err.message}`);
      return {
        summary: `Lab report contains ${labs.length} tests. ${abnormalLabs.length} values are outside normal range.`,
        keyFindings: abnormalLabs.map(l => `${l.test}: ${l.value} ${l.unit} (${l.status})`),
        clinicalImplications: ['Clinical review recommended for abnormal values'],
        recommendations: ['Consult with treating physician'],
        mock: true,
      };
    }
  }
}

module.exports = DetailedReportSummary;
