// ──────────────────────────────────────────────────────────
// HuggingFace Inference Client
// ──────────────────────────────────────────────────────────
//
// Centralized service layer for all HuggingFace API calls.
// Reads HF_TOKEN from environment. Falls back to mock mode
// when the token is missing or the API is unreachable.
//
// Supported tasks:
//   • textGeneration   — TxGemma (SOAP, referrals, chat)
//   • imageTextToText  — MedGemma (multimodal image analysis)
//   • speechRecognition — MedASR (voice intake)
//
// Usage:
//   const hf = require('./huggingfaceClient');
//   const text = await hf.textGeneration(model, prompt, opts);
//   const result = await hf.imageTextToText(model, image, prompt, opts);
// ──────────────────────────────────────────────────────────

require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_API_BASE = 'https://router.huggingface.co';

// ── Connection status ─────────────────────────────────────

let _tokenValid = null; // null = unchecked, true/false = verified

function isConfigured() {
  return HF_TOKEN.length > 0 && HF_TOKEN.startsWith('hf_');
}

function getStatus() {
  return {
    configured: isConfigured(),
    tokenPresent: HF_TOKEN.length > 0,
    tokenValid: _tokenValid,
  };
}

// ── Core fetch wrapper ────────────────────────────────────

async function hfFetch(url, body, options = {}) {
  if (!isConfigured()) {
    throw new Error('HF_TOKEN not configured — falling back to mock mode');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      _tokenValid = response.status !== 401 && response.status !== 403;

      // Model may be loading (503)
      if (response.status === 503) {
        const parsed = JSON.parse(errorBody).catch?.(() => null);
        const eta = parsed?.estimated_time || 'unknown';
        throw new Error(`Model is loading (ETA: ${eta}s). Try again shortly.`);
      }

      throw new Error(`HF API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    _tokenValid = true;
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────────────────
// Text Generation (TxGemma) — OpenAI-compatible via HF Router
// ──────────────────────────────────────────────────────────

/**
 * Generate text using HuggingFace's OpenAI-compatible chat completions API.
 *
 * @param {string} modelId    — e.g. 'google/txgemma-9b-predict'
 * @param {string} prompt     — Full prompt text
 * @param {Object} [opts]
 * @param {number} [opts.maxTokens]    — Max new tokens (default: 1024)
 * @param {number} [opts.temperature]  — Sampling temperature (default: 0.3)
 * @returns {Promise<{ generated_text: string }>}
 */
async function textGeneration(modelId, prompt, opts = {}) {
  const url = `${HF_API_BASE}/v1/chat/completions`;

  console.log(`  🧠 HF textGeneration → ${modelId}`);
  console.log(`     Prompt length: ${prompt.length} chars`);

  const result = await hfFetch(url, {
    model: modelId,
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: opts.maxTokens || 1024,
    temperature: opts.temperature || 0.3,
  }, { timeoutMs: opts.timeoutMs || 60000 });

  // OpenAI-compatible response format
  const text = result.choices?.[0]?.message?.content || '';
  return {
    generated_text: text,
    raw: result,
  };
}

// ──────────────────────────────────────────────────────────
// Image + Text → Text (MedGemma)
// ──────────────────────────────────────────────────────────

/**
 * Analyze an image with text context using a multimodal model.
 *
 * @param {string} modelId     — e.g. 'google/medgemma-4b-it'
 * @param {string} imageBase64 — Base64-encoded image (with or without data URI prefix)
 * @param {string} prompt      — Text prompt for the model
 * @param {Object} [opts]
 * @returns {Promise<{ generated_text: string }>}
 */
async function imageTextToText(modelId, imageBase64, prompt, opts = {}) {
  const url = `${HF_API_BASE}/${modelId}`;

  // Strip data URI prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  console.log(`  🖼️ HF imageTextToText → ${modelId}`);
  console.log(`     Image size: ~${Math.round(cleanBase64.length * 0.75 / 1024)}KB, prompt: ${prompt.length} chars`);

  const result = await hfFetch(url, {
    inputs: {
      image: cleanBase64,
      text: prompt,
    },
    parameters: {
      max_new_tokens: opts.maxTokens || 512,
      temperature: opts.temperature || 0.3,
    },
  }, { timeoutMs: opts.timeoutMs || 60000 });

  const output = Array.isArray(result) ? result[0] : result;
  return {
    generated_text: output.generated_text || output.text || '',
    raw: output,
  };
}

// ──────────────────────────────────────────────────────────
// Speech Recognition (MedASR / Whisper)
// ──────────────────────────────────────────────────────────

/**
 * Transcribe audio using a speech recognition model.
 *
 * @param {string} modelId  — e.g. 'openai/whisper-large-v3'
 * @param {Buffer} audio    — Raw audio buffer
 * @param {Object} [opts]
 * @returns {Promise<{ text: string }>}
 */
async function speechRecognition(modelId, audio, opts = {}) {
  if (!isConfigured()) {
    throw new Error('HF_TOKEN not configured — falling back to mock mode');
  }

  const url = `${HF_API_BASE}/${modelId}`;

  console.log(`  🎙️ HF speechRecognition → ${modelId}`);
  console.log(`     Audio size: ~${Math.round(audio.length / 1024)}KB`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || 60000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: audio,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`HF API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const result = await response.json();
    return { text: result.text || '' };
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────────────────
// Prompt Builders
// ──────────────────────────────────────────────────────────

/**
 * Build a structured SOAP note prompt for TxGemma.
 */
function buildSOAPPrompt({ patientName, age, gender, condition, vitals, history, risk, notes }) {
  const patientJson = JSON.stringify({
    name: patientName,
    age: age,
    gender: gender,
    chief_complaint: condition,
    symptoms: ["Not specified"], // Could be parameterized in the future
    vitals: {
      heart_rate: vitals?.heartRate || "--",
      bp: vitals?.bloodPressure ? `${vitals.bloodPressure.sys}/${vitals.bloodPressure.dia}` : "--",
      spo2: vitals?.spO2 || "--",
      temp: vitals?.temperature ? `${vitals.temperature} F` : "--",
      resp: vitals?.respiration || "--"
    },
    risk: risk || "stable",
    history: history || "Not specified",
    clinical_context: notes || "None"
  }, null, 2);

  return `You are a clinical documentation assistant generating a professional SOAP note for a licensed physician.

This is a clinical support tool.  
Do NOT provide definitive diagnoses or treatment decisions.  
All outputs must be suitable for physician review and editing.

You will receive structured patient JSON including:
- demographics
- vitals
- symptoms
- history
- risk level
- clinical context

Generate a clean, structured SOAP note using professional medical documentation style.

OUTPUT FORMAT (STRICT MARKDOWN):

## SUBJECTIVE
- **Chief Complaint:**  
- **History of Present Illness:**  
- **Review of Systems:**  
  - Constitutional:  
  - Cardiovascular:  
  - Respiratory:  
  - Neurological:  

## OBJECTIVE

### Vital Signs
Use table format:

| Parameter | Value | Status |
|-----------|-------|--------|

Include:
- Heart Rate  
- Blood Pressure  
- SpO2  
- Temperature  
- Respiratory Rate  

### Physical Examination
Provide concise bullet points by system:
- General  
- HEENT  
- Cardiovascular  
- Pulmonary  
- Abdomen  
- Extremities  

## ASSESSMENT
- **Primary Clinical Impression:**  
- **Current Status:**  
- **Risk Stratification:** (Low / Moderate / High)  
- **Differential Diagnosis:**  
  - Item 1  
  - Item 2  
  - Item 3  

Include a short reasoning paragraph explaining clinical thinking and uncertainty.

## PLAN

### Monitoring
- Bullet points

### Medications
- Bullet points

### Diagnostics
- Bullet points

### Follow-up
- Bullet points

### Safety Considerations
Mention escalation triggers or red flags if present.

------------------------------------

RULES:
- Use professional clinical tone
- No emojis
- No decorative characters
- No checkmarks
- No pipes or ASCII formatting
- No markdown outside specified structure
- Keep concise but complete
- Avoid hallucinating data not provided
- If data missing, write "Not specified"

Always prioritize clarity for physician review.

Patient JSON:
${patientJson}

Generate the SOAP note. Follow output format EXACTLY. Do not add extra sections.`;
}

/**
 * Build a referral letter prompt for TxGemma.
 */
function buildReferralPrompt({ patient, referringDoctor, targetSpecialty, reason, notes }) {
  const patientJson = JSON.stringify({
    name: patient?.name || 'Unknown',
    age: patient?.age || '--',
    gender: patient?.gender || '--',
    condition: patient?.condition || 'Not specified',
    vitals: {
      heart_rate: patient?.vitals?.heartRate || "--",
      bp: patient?.vitals?.bloodPressure ? `${patient.vitals.bloodPressure.sys}/${patient.vitals.bloodPressure.dia}` : "--",
      spo2: patient?.vitals?.spO2 || "--",
      temp: patient?.vitals?.temperature ? `${patient.vitals.temperature} F` : "--",
      resp: patient?.vitals?.respiration || "--"
    },
    referring_doctor: referringDoctor || 'Not specified',
    target_specialty: targetSpecialty || 'Not specified',
    reason: reason || 'Specialist evaluation requested',
    additional_notes: notes || 'None'
  }, null, 2);

  return `You are generating a concise medical referral summary for a physician.

Include:
- patient overview
- key findings
- reason for referral
- urgency
- suggested specialty

Use structured markdown.
Be concise and professional.

Patient JSON:
${patientJson}

Generate the referral summary. Follow output format EXACTLY. Do not add extra sections.`;
}

/**
 * Build a medical image analysis prompt for MedGemma.
 */
function buildImagePrompt(imageType, patientContext) {
  const symptoms = patientContext.symptoms || 'Not provided';
  const vitals = patientContext.vitals || {};
  const age = patientContext.age || 'Unknown';
  const gender = patientContext.gender || 'Unknown';
  const condition = patientContext.condition || 'Not specified';

  return `You are a radiologist AI assistant. Analyze this ${imageType} image and provide a structured clinical report.

**Patient:** ${age} years old, ${gender}
**Presenting Symptoms:** ${symptoms}
**Known Condition:** ${condition}
**Vitals:** HR ${vitals.heartRate || '--'}, SpO2 ${vitals.spO2 || '--'}%, Temp ${vitals.temperature || '--'}°F

Provide your analysis in the following JSON format:
{
  "differential": ["diagnosis 1", "diagnosis 2", "diagnosis 3"],
  "reasoning": "detailed radiological interpretation",
  "redFlags": ["urgent finding 1", "urgent finding 2"],
  "confidence": "low|moderate|high"
}

Be thorough. Flag any critical or urgent findings.`;
}

/**
 * Build a chat prompt for TxGemma.
 */
function buildChatPrompt(message, patientContext) {
  const ctx = patientContext
    ? `\nCurrent patient: ${patientContext.name || 'Unknown'}, ${patientContext.age || '--'}y, ${patientContext.condition || 'N/A'}. Vitals: HR ${patientContext.vitals?.heartRate || '--'}, SpO2 ${patientContext.vitals?.spO2 || '--'}%.`
    : '';

  return `You are a clinical AI assistant for doctors. Provide evidence-based, concise clinical guidance. Always note that AI suggestions should be verified with clinical judgment.${ctx}

Doctor's question: ${message}`;
}

// ──────────────────────────────────────────────────────────
// Response Parsers
// ──────────────────────────────────────────────────────────

/**
 * Parse a SOAP note response from TxGemma into structured sections.
 */
function parseSOAPResponse(text) {
  const sections = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  };

  // Try to split by markdown headers
  const subjectiveMatch = text.match(/##?\s*Subjective\s*\n([\s\S]*?)(?=##?\s*Objective|$)/i);
  const objectiveMatch = text.match(/##?\s*Objective\s*\n([\s\S]*?)(?=##?\s*Assessment|$)/i);
  const assessmentMatch = text.match(/##?\s*Assessment\s*\n([\s\S]*?)(?=##?\s*Plan|$)/i);
  const planMatch = text.match(/##?\s*Plan\s*\n([\s\S]*?)$/i);

  sections.subjective = subjectiveMatch?.[1]?.trim() || text.slice(0, Math.floor(text.length / 4));
  sections.objective = objectiveMatch?.[1]?.trim() || '';
  sections.assessment = assessmentMatch?.[1]?.trim() || '';
  sections.plan = planMatch?.[1]?.trim() || '';

  return sections;
}

/**
 * Parse a structured JSON response from MedGemma image analysis.
 */
function parseImageResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        differential: parsed.differential || [],
        reasoning: parsed.reasoning || text,
        redFlags: parsed.redFlags || parsed.red_flags || [],
        confidence: parsed.confidence || 'moderate',
      };
    }
  } catch {
    // JSON parsing failed — return raw text as reasoning
  }

  return {
    differential: ['See full analysis below'],
    reasoning: text,
    redFlags: [],
    confidence: 'moderate',
  };
}

// ──────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────

module.exports = {
  // Core API functions
  textGeneration,
  imageTextToText,
  speechRecognition,

  // Prompt builders
  buildSOAPPrompt,
  buildReferralPrompt,
  buildImagePrompt,
  buildChatPrompt,

  // Response parsers
  parseSOAPResponse,
  parseImageResponse,

  // Status
  isConfigured,
  getStatus,
};
