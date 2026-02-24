// ──────────────────────────────────────────────────────────
// Agent #4 — Tabular Lab Extractor
// Model: Gemini 2.5 Flash (Vision) — for reliable OCR
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class TabularLabExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'tabular-lab-extractor',
      name: 'Tabular Lab Extractor',
      number: 4,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'gemini-2.5-flash',
      modelName: 'Gemini 2.5 Flash',
      task: 'image-text-to-text',
      description: 'Extracts structured lab data (tests, values, units, ranges) from report images using Gemini Vision',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;

    if (!imageBase64) {
      return { labs: [], count: 0, mock: false, error: 'No image provided' };
    }

    if (!GEMINI_API_KEY) {
      console.warn('  ⚠️ GEMINI_API_KEY not configured, cannot extract labs');
      return { labs: [], count: 0, mock: false, error: 'Gemini API key not configured' };
    }

    const prompt = `You are a medical lab report OCR system. Analyze this medical lab report image carefully.

Extract ALL lab test results visible in the image. For each test, determine:
1. The test name exactly as written
2. The numeric value exactly as shown
3. The unit of measurement
4. The reference/normal range if shown
5. Status: "normal" if value is within range, "high" if above, "low" if below, "critical" if severely abnormal

Return ONLY a valid JSON array. Example format:
[{"test":"Hemoglobin","value":"11.6","unit":"gm/dl","referenceRange":"13.0-17.0","status":"low"}]

Rules:
- Extract EVERY single test result visible, do not skip any
- Use exact values from the image, do NOT make up or estimate values
- Include ALL tests from ALL sections (CBC, differential, absolute counts, etc.)
- Return ONLY the JSON array, absolutely no other text before or after it`;

    try {
      console.log('     🔬 Using Gemini Vision for lab extraction...');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // Clean base64 - remove data URI prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          temperature: 0.1, // Very low temp for accuracy
          maxOutputTokens: 4096,
        },
      });

      const text = response.text || '';
      console.log(`     📄 Gemini response: ${text.length} chars`);

      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`     ✅ Extracted ${parsed.length} lab values via Gemini Vision`);
          return { labs: parsed, count: parsed.length, mock: false };
        }
      }

      console.warn(`     ⚠️ Could not parse lab data from Gemini response`);
      return { labs: [], count: 0, mock: false, error: 'Could not parse lab data from response' };
    } catch (err) {
      console.error(`     ❌ Gemini lab extraction failed: ${err.message}`);
      return { labs: [], count: 0, mock: false, error: err.message };
    }
  }
}

module.exports = TabularLabExtractor;
