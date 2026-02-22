// ──────────────────────────────────────────────────────────
// Speech Model — MedASR Adapter
// ──────────────────────────────────────────────────────────
//
// This module handles audio transcription for voice intake.
// Currently returns mock transcripts.
//
// When ready, swap with a real call:
//
//   const { HfInference } = require('@huggingface/inference');
//   const hf = new HfInference(process.env.HF_TOKEN);
//   const result = await hf.automaticSpeechRecognition({
//     model: MODEL_REGISTRY.medasr.id,
//     data: audioBuffer,
//   });
//   return { transcript: result.text };
//
// Supported model slot:
//   • medasr — google/medasr (medical speech recognition)
// ──────────────────────────────────────────────────────────

const hf = require('./huggingfaceClient');

const MODEL_REGISTRY = {
  medasr: {
    id: 'google/medasr',
    task: 'automatic-speech-recognition',
    description: 'Medical speech recognition — voice intake transcription',
  },
  whisper: {
    id: 'openai/whisper-large-v3',
    task: 'automatic-speech-recognition',
    description: 'General-purpose speech recognition (fallback)',
  },
};

// ── Mock transcripts for different clinical scenarios ─────

const MOCK_TRANSCRIPTS = [
  {
    transcript: "Patient reports persistent headache for the past three days, primarily in the frontal region. Pain rated 6 out of 10. Associated with mild nausea but no vomiting. No visual disturbances or neck stiffness. Over-the-counter acetaminophen provides partial relief. No recent trauma or falls.",
    keywords: ['headache', 'frontal', 'nausea', 'acetaminophen'],
    duration: 12.4,
  },
  {
    transcript: "Chief complaint is shortness of breath on exertion for the last week. Patient reports difficulty climbing more than one flight of stairs. Denies chest pain or palpitations. Has a history of mild asthma, last used inhaler two months ago. No recent upper respiratory infection. Non-smoker.",
    keywords: ['shortness of breath', 'exertion', 'asthma', 'inhaler'],
    duration: 15.1,
  },
  {
    transcript: "Patient presents with sharp lower back pain that started two days ago after lifting heavy boxes. Pain radiates to the left leg. Worse with sitting and bending. No numbness or tingling in the feet. No bowel or bladder changes. Has been taking ibuprofen 400mg three times daily with moderate relief.",
    keywords: ['lower back pain', 'radiating', 'ibuprofen', 'lifting'],
    duration: 14.8,
  },
  {
    transcript: "Complaining of sore throat and dry cough for five days. Low-grade fever of 99.8 degrees measured at home. No difficulty swallowing but reports mild ear pain on the left side. No rash. No sick contacts at work. Has not traveled recently.",
    keywords: ['sore throat', 'cough', 'fever', 'ear pain'],
    duration: 11.2,
  },
  {
    transcript: "Patient describes intermittent burning sensation in the upper abdomen, especially after meals. Symptoms worse with spicy food and at night when lying down. Occasional acid taste in mouth. No weight loss or difficulty swallowing. No blood in stool. Taking antacids as needed.",
    keywords: ['burning', 'upper abdomen', 'acid reflux', 'antacids'],
    duration: 13.6,
  },
];

/**
 * Transcribe an audio buffer to text.
 *
 * @param {Object}  params
 * @param {Buffer}  params.audio      — Raw audio data
 * @param {string}  [params.mimeType] — e.g. "audio/webm", "audio/wav"
 * @param {string}  [params.language] — Language hint (default: "en")
 * @param {string}  [params.model]    — Model slot (default: "medasr")
 * @returns {Promise<Object>}
 */
async function transcribeAudio({ audio, mimeType = 'audio/webm', language = 'en', model = 'medasr' }) {
  const modelInfo = MODEL_REGISTRY[model];
  if (!modelInfo) throw new Error(`Unknown speech model: "${model}"`);

  console.log(`  🎙️ Transcribing audio — ${mimeType}, language: ${language}, model: ${modelInfo.id}`);

  // ── Try real speech recognition ───────────────────────────

  if (hf.isConfigured()) {
    try {
      const result = await hf.speechRecognition(modelInfo.id, audio, {
        timeoutMs: 60000,
      });

      return {
        transcript: result.text,
        keywords: [],
        confidence: 0.95,
        duration: null,
        language,
        model: modelInfo.id,
        timestamp: new Date().toISOString(),
        mock: false,
        source: 'huggingface',
      };
    } catch (err) {
      console.warn(`  ⚠️ Speech recognition failed, falling back to mock: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ HF_TOKEN not configured — using mock transcription');
  }

  // ── Mock fallback ─────────────────────────────────────────

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Pick a random mock transcript
  const mock = MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)];

  return {
    transcript: mock.transcript,
    keywords: mock.keywords,
    confidence: 0.94,
    duration: mock.duration,
    language,
    model: modelInfo.id,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

module.exports = { transcribeAudio, MODEL_REGISTRY };
