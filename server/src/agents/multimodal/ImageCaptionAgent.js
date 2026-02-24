// ──────────────────────────────────────────────────────────
// Agent #18 — Image Caption Agent
// Model: google/medgemma-4b-it
// Layer: Multimodal Image
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class ImageCaptionAgent extends BaseAgent {
  constructor() {
    super({
      id: 'image-caption',
      name: 'Image Caption Agent',
      number: 18,
      layer: 'Multimodal Image',
      layerNumber: 4,
      modelId: 'google/medgemma-4b-it',
      modelName: 'MedGemma 4B',
      task: 'image-text-to-text',
      description: 'Generates clinical captions and descriptions for medical images',
    });
  }

  async process(input, options) {
    const { imageBase64 } = input;
    const imageType = input['medical-image-confirm']?.imageType || 'medical_image';

    if (imageBase64 && hf.isConfigured()) {
      try {
        const prompt = `Generate a detailed clinical caption for this ${imageType.replace(/_/g, ' ')} image. Include anatomical structures visible, any abnormalities, and clinical significance. Return JSON: {"caption": "", "detailedDescription": "", "anatomicalStructures": [], "abnormalities": [], "clinicalRelevance": ""}`;
        const result = await hf.imageTextToText(options.modelId, imageBase64, prompt, { maxTokens: 512 });
        const parsed = JSON.parse(result.generated_text.match(/\{.*\}/s)?.[0] || '{}');
        return { ...parsed, mock: false };
      } catch (err) {
        console.warn(`  ⚠️ Image captioning failed: ${err.message}`);
      }
    }

    return {
      caption: 'PA chest radiograph demonstrating clear lung fields with normal cardiac silhouette',
      detailedDescription: 'Posteroanterior chest radiograph showing bilateral clear lung fields without focal airspace disease. The cardiac silhouette is normal in size. Mediastinal contours are unremarkable. Osseous structures are intact.',
      anatomicalStructures: ['Bilateral lungs', 'Heart', 'Diaphragm', 'Ribs', 'Trachea', 'Mediastinum'],
      abnormalities: [],
      clinicalRelevance: 'Normal study — no acute findings to correlate with respiratory symptoms',
      mock: true,
    };
  }
}

module.exports = ImageCaptionAgent;
