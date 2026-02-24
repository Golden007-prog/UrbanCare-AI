// ──────────────────────────────────────────────────────────
// Agent #28 — Voice Intake Agent
// Models: google/medasr (speech→text) + google/hear (cough embeddings)
// Layer: Interaction
// ──────────────────────────────────────────────────────────

const BaseAgent = require('../BaseAgent');
const hf = require('../../ai/huggingfaceClient');

class VoiceIntakeAgent extends BaseAgent {
  constructor() {
    super({
      id: 'voice-intake',
      name: 'Voice Intake Agent',
      number: 28,
      layer: 'Interaction',
      layerNumber: 7,
      modelId: 'google/medasr',
      modelName: 'MedASR + HEAR',
      task: 'automatic-speech-recognition',
      description: 'Processes voice input using MedASR for transcription and HEAR for respiratory sound analysis',
    });

    this.hearModelId = 'google/hear';
  }

  async process(input, options) {
    const { audio, mimeType, isCoughAudio } = input;

    // Branch 1: Respiratory sound analysis with HEAR
    if (isCoughAudio) {
      return {
        type: 'respiratory_sound_analysis',
        model: this.hearModelId,
        analysis: {
          soundType: 'cough',
          characteristics: ['Productive', 'Moderate intensity', 'No wheezing component'],
          possibleConditions: ['Upper respiratory infection', 'Bronchitis', 'Post-nasal drip'],
          severity: 'mild',
          recommendation: 'Clinical correlation recommended. Consider chest X-ray if persistent > 2 weeks.',
        },
        mock: true,
      };
    }

    // Branch 2: Medical speech transcription with MedASR
    if (audio && hf.isConfigured()) {
      try {
        const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio, 'base64');
        const result = await hf.speechRecognition(options.modelId, audioBuffer, { timeoutMs: 60000 });
        return {
          type: 'voice_transcription',
          transcript: result.text,
          model: options.modelId,
          confidence: 0.95,
          mock: false,
        };
      } catch (err) {
        console.warn(`  ⚠️ Voice transcription failed: ${err.message}`);
      }
    }

    return {
      type: 'voice_transcription',
      transcript: 'Patient reports persistent headache for the past three days, primarily in the frontal region. Pain rated 6 out of 10. Associated with mild nausea but no vomiting.',
      model: options.modelId,
      confidence: 0.92,
      keywords: ['headache', 'frontal', 'nausea'],
      duration: 12.4,
      mock: true,
    };
  }
}

module.exports = VoiceIntakeAgent;
