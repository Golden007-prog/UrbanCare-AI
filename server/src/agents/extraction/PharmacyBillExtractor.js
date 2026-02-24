// ──────────────────────────────────────────────────────────
// Agent #10 — Pharmacy Bill Extractor
// Model: google/medgemma-4b-it
// Layer: Extraction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class PharmacyBillExtractor extends BaseAgent {
  constructor() {
    super({
      id: 'pharmacy-bill-extractor',
      name: 'Pharmacy Bill Extractor',
      number: 10,
      layer: 'Extraction',
      layerNumber: 2,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Extracts pharmacy bill items, costs, and totals from bill images',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `Extract all items from this pharmacy bill. Return JSON: {"items": [{"name": "", "quantity": 0, "unitPrice": 0, "total": 0}], "subtotal": 0, "tax": 0, "grandTotal": 0, "pharmacy": "", "date": ""}`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Bill extraction failed: ${err.message}`);
      }
    }

    return {
      items: [
        { name: 'Metformin 500mg (30 tabs)', quantity: 1, unitPrice: 120, total: 120 },
        { name: 'Amlodipine 5mg (30 tabs)', quantity: 1, unitPrice: 85, total: 85 },
        { name: 'Aspirin 75mg (30 tabs)', quantity: 1, unitPrice: 35, total: 35 },
        { name: 'Pantoprazole 40mg (14 tabs)', quantity: 1, unitPrice: 95, total: 95 },
      ],
      subtotal: 335,
      tax: 17,
      grandTotal: 352,
      pharmacy: 'UrbanCare Pharmacy',
      date: new Date().toISOString().split('T')[0],
      mock: true,
    };
  }
}

module.exports = PharmacyBillExtractor;
