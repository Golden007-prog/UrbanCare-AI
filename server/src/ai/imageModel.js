// ──────────────────────────────────────────────────────────
// Image Model — MedGemma / MedASR Adapter
// ──────────────────────────────────────────────────────────
//
// This module wraps medical image analysis.  Right now it returns
// deterministic mock responses.  When you're ready, swap the
// `analyzeMedicalImage()` body with a real HuggingFace call:
//
//   const { HfInference } = require('@huggingface/inference');
//   const hf = new HfInference(process.env.HF_TOKEN);
//
// Supported model slots:
//   • medgemma  — google/medgemma-4b-it   (image + text → text)
//   • medasr   — (speech/audio pipeline, future)
// ──────────────────────────────────────────────────────────

const hf = require('./huggingfaceClient');
const MODEL_REGISTRY = {
  medgemma: {
    id: 'google/medgemma-4b-it',
    task: 'image-text-to-text',
    description: 'Multimodal medical image analysis',
  },
  medasr: {
    id: 'openai/whisper-large-v3',
    task: 'automatic-speech-recognition',
    description: 'Medical speech recognition (future)',
  },
};

// ──────────────────────────────────────────────────────────
// analyzeMedicalImage
// ──────────────────────────────────────────────────────────
//
// Primary analysis function.  Accepts a base-64 image and
// patient context (symptoms, vitals) to produce a structured
// diagnostic report.
//
// Returns:
// {
//   differential: string[],
//   reasoning: string,
//   redFlags: string[],
//   confidence: "low" | "moderate" | "high"
// }
// ──────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {string} params.imageBase64    — Base-64 encoded image (data URI or raw)
 * @param {string} [params.imageType]    — e.g. "chest-xray", "ct-head", "skin-lesion"
 * @param {Object} [params.patientContext]
 * @param {string} [params.patientContext.symptoms]   — free-text chief complaint
 * @param {Object} [params.patientContext.vitals]     — { heartRate, spO2, temperature, respiration }
 * @param {string} [params.patientContext.condition]  — existing diagnosis
 * @param {number} [params.patientContext.age]
 * @param {string} [params.patientContext.gender]
 * @param {string} [params.model]         — model slot (default: "medgemma")
 * @returns {Promise<Object>}
 */
async function analyzeMedicalImage({
  imageBase64,
  imageType = 'chest-xray',
  patientContext = {},
  model = 'medgemma',
}) {
  const modelInfo = MODEL_REGISTRY[model];
  if (!modelInfo) {
    throw new Error(
      `Unknown image model: "${model}". Available: ${Object.keys(MODEL_REGISTRY).join(', ')}`
    );
  }

  const symptoms = (patientContext.symptoms || '').toLowerCase();
  const vitals = patientContext.vitals || {};
  const age = patientContext.age || null;
  const condition = (patientContext.condition || '').toLowerCase();

  // ── Try real MedGemma inference ───────────────────────────

  if (hf.isConfigured()) {
    try {
      const prompt = hf.buildImagePrompt(imageType, patientContext);

      const result = await hf.imageTextToText(modelInfo.id, imageBase64, prompt, {
        maxTokens: 512,
        temperature: 0.3,
        timeoutMs: 60000,
      });

      const parsed = hf.parseImageResponse(result.generated_text);

      return {
        ...parsed,
        model: modelInfo.id,
        imageType,
        timestamp: new Date().toISOString(),
        mock: false,
        source: 'huggingface',
      };
    } catch (err) {
      console.warn(`  ⚠️ MedGemma inference failed, falling back to mock: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ HF_TOKEN not configured — using mock image analysis');
  }

  // ── Mock fallback (context-aware) ─────────────────────────

  const type = imageType.toLowerCase().replace(/[\s_]+/g, '-');

  if (type === 'chest-xray' || type === 'xray' || type === 'chest') {
    return buildChestXrayResult(symptoms, vitals, age, condition, modelInfo);
  }
  if (type === 'ct-scan' || type === 'ct-head' || type === 'ct') {
    return buildCTResult(symptoms, vitals, age, condition, modelInfo);
  }
  if (type === 'skin-lesion' || type === 'skin' || type === 'dermatology') {
    return buildSkinResult(symptoms, vitals, age, condition, modelInfo);
  }
  if (type === 'ecg' || type === 'ekg') {
    return buildECGResult(symptoms, vitals, age, condition, modelInfo);
  }

  // Fallback for unknown image types
  return {
    differential: [`Unclassified finding on ${imageType}`],
    reasoning: `Image of type "${imageType}" received for analysis. Mock analysis generated — connect MedGemma for real inference.`,
    redFlags: [],
    confidence: 'low',
    model: modelInfo.id,
    imageType,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

// ──────────────────────────────────────────────────────────
// Mock builders (context-aware)
// ──────────────────────────────────────────────────────────

function buildChestXrayResult(symptoms, vitals, age, condition, modelInfo) {
  const tachycardic = vitals.heartRate > 100;
  const hypoxic = vitals.spO2 < 94;
  const febrile = vitals.temperature > 100.4;

  const differential = ['Community-acquired pneumonia'];
  const redFlags = [];

  if (symptoms.includes('cough') || symptoms.includes('fever') || febrile) {
    differential.push('Acute bronchitis', 'Lung abscess');
  }
  if (symptoms.includes('chest pain') || symptoms.includes('dyspnea')) {
    differential.push('Pulmonary embolism', 'Pleural effusion');
  }
  if (symptoms.includes('weight loss') || (age && age > 55)) {
    differential.push('Bronchogenic carcinoma');
  }
  if (differential.length < 3) {
    differential.push('Atelectasis', 'Viral pneumonitis');
  }

  if (hypoxic) redFlags.push('SpO2 < 94% — hypoxemia present, consider supplemental O2');
  if (tachycardic) redFlags.push('Tachycardia (HR > 100) — may indicate systemic response');
  if (febrile) redFlags.push('Febrile — active infection likely');
  if (symptoms.includes('hemoptysis')) redFlags.push('Hemoptysis reported — urgent workup needed');

  const confidence = redFlags.length >= 2 ? 'high' : redFlags.length === 1 ? 'moderate' : 'moderate';

  return {
    differential,
    reasoning: `Chest X-ray shows patchy opacity in the right lower lobe with air bronchograms, consistent with consolidation. ${hypoxic ? 'Hypoxemia supports an active parenchymal process. ' : ''}${febrile ? 'Fever suggests infectious etiology. ' : ''}Cardiac silhouette is within normal limits. No pneumothorax. ${age && age > 55 ? 'Given patient age, malignancy should be considered in differential.' : 'Clinical correlation recommended.'}`,
    redFlags,
    confidence,
    model: modelInfo.id,
    imageType: 'chest-xray',
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

function buildCTResult(symptoms, vitals, age, condition, modelInfo) {
  const differential = ['Normal CT — no acute pathology'];
  const redFlags = [];

  if (symptoms.includes('headache') || symptoms.includes('confusion')) {
    differential.length = 0;
    differential.push('Tension-type headache', 'Migraine with aura', 'Subarachnoid hemorrhage');
    if (symptoms.includes('worst headache')) {
      redFlags.push('Thunderclap headache — rule out SAH urgently');
    }
  }
  if (symptoms.includes('weakness') || symptoms.includes('numbness')) {
    differential.push('Acute ischemic stroke', 'TIA');
    redFlags.push('Focal neurological deficit — activate stroke protocol');
  }
  if (symptoms.includes('seizure')) {
    differential.push('Seizure disorder', 'Space-occupying lesion');
  }

  return {
    differential,
    reasoning: `Non-contrast CT of the head demonstrates ${symptoms.includes('headache') ? 'no obvious hemorrhage or midline shift' : 'normal brain parenchyma'}. Ventricles are symmetric and non-dilated. Grey-white matter differentiation is preserved. ${redFlags.length ? 'However, clinical symptoms warrant further investigation.' : 'No acute intracranial pathology identified.'}`,
    redFlags,
    confidence: redFlags.length > 0 ? 'moderate' : 'high',
    model: modelInfo.id,
    imageType: 'ct-head',
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

function buildSkinResult(symptoms, vitals, age, condition, modelInfo) {
  const differential = ['Benign melanocytic nevus', 'Seborrheic keratosis'];
  const redFlags = [];

  if (symptoms.includes('growing') || symptoms.includes('changing') || symptoms.includes('irregular')) {
    differential.length = 0;
    differential.push('Malignant melanoma', 'Dysplastic nevus', 'Basal cell carcinoma');
    redFlags.push('Lesion meeting ABCDE criteria — dermatology referral recommended');
  }
  if (symptoms.includes('bleeding') || symptoms.includes('ulcerated')) {
    redFlags.push('Ulceration/bleeding — biopsy indicated');
    differential.push('Squamous cell carcinoma');
  }
  if (age && age > 50) {
    differential.push('Actinic keratosis');
  }

  return {
    differential,
    reasoning: `Skin lesion analysis shows ${redFlags.length ? 'irregular borders with asymmetric pigmentation' : 'a well-circumscribed lesion with uniform pigmentation'}. ${redFlags.length ? 'Multiple ABCDE warning signs are present. ' : 'No high-risk dermoscopic features. '}Clinical correlation with patient history is recommended.`,
    redFlags,
    confidence: redFlags.length > 0 ? 'moderate' : 'high',
    model: modelInfo.id,
    imageType: 'skin-lesion',
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

function buildECGResult(symptoms, vitals, age, condition, modelInfo) {
  const differential = ['Normal sinus rhythm'];
  const redFlags = [];
  const tachycardic = vitals.heartRate > 100;

  if (tachycardic) {
    differential.length = 0;
    differential.push('Sinus tachycardia', 'SVT', 'Atrial fibrillation');
  }
  if (symptoms.includes('chest pain') || symptoms.includes('palpitations')) {
    differential.push('Acute coronary syndrome', 'NSTEMI');
    redFlags.push('Chest pain + ECG changes — obtain serial troponins');
  }
  if (symptoms.includes('syncope')) {
    differential.push('Bradyarrhythmia', 'Long QT syndrome');
    redFlags.push('Syncope — continuous telemetry monitoring indicated');
  }

  return {
    differential,
    reasoning: `ECG shows ${tachycardic ? 'rate of ~' + vitals.heartRate + ' bpm with narrow QRS complexes' : 'regular rhythm at ~' + (vitals.heartRate || 72) + ' bpm'}. ${symptoms.includes('chest pain') ? 'Given chest pain, must rule out acute coronary syndrome. Serial ECGs and troponins recommended.' : 'No acute ST changes identified.'} PR interval and QTc appear within normal limits.`,
    redFlags,
    confidence: redFlags.length > 0 ? 'moderate' : 'high',
    model: modelInfo.id,
    imageType: 'ecg',
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

module.exports = { analyzeMedicalImage, MODEL_REGISTRY };
