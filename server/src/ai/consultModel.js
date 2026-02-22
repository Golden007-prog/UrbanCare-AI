// ──────────────────────────────────────────────────────────
// Consult Model — Gemini AI Clinical Copilot
// ──────────────────────────────────────────────────────────
//
// Powers the multilingual AI clinical copilot. Routes all
// chat through the Gemini 2.5 Flash API with:
//   • Patient context injection
//   • Multilingual response matching
//   • Structured output mode (JSON blocks)
//   • Clinical safety guardrails
//   • Chat history management (last 20 messages)
//
// Endpoint: POST /api/ai-consult
// ──────────────────────────────────────────────────────────

const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = 'gemini-2.0-flash';

// ── Language Map ────────────────────────────────────────────

const LANGUAGE_MAP = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  es: 'Spanish',
  ar: 'Arabic',
};

// ── Quick Action Prompt Templates ──────────────────────────

const ACTION_PROMPTS = {
  'generate-soap': `Generate a comprehensive SOAP note for this patient based on their current vitals, condition, and clinical context. Use proper medical formatting with Subjective, Objective, Assessment, and Plan sections.`,

  'explain-vitals': `Explain the current vital signs for this patient in clinical context. Highlight any abnormalities, trends of concern, and what they may indicate. Be specific about each vital parameter.`,

  'risk-reasoning': `Provide detailed clinical reasoning about this patient's risk level. Analyze their vitals, condition, and any active alerts. Explain what factors contribute to their current risk stratification and what to monitor.`,

  'suggest-medication': `Based on this patient's condition, vitals, and clinical context, provide non-prescriptive medication guidance. Suggest drug classes that may be relevant, note potential interactions, and emphasize that final prescribing decisions must be made by the treating physician. This is guidance only, NOT a prescription.`,

  'translate-for-patient': `Provide a patient-friendly explanation of their current health status, condition, and care plan. Use simple, non-technical language that a patient or family member would understand. Avoid medical jargon. Include reassurance where appropriate.`,

  'discharge-summary': `Generate a structured discharge summary for this patient including:
- Admission diagnosis
- Hospital course summary
- Current status at discharge
- Medications at discharge
- Follow-up instructions
- Warning signs to watch for
- Lifestyle recommendations`,

  'follow-up-plan': `Create a detailed follow-up care plan for this patient including:
- Recommended follow-up timeline
- Monitoring parameters
- Lab work needed
- Specialist referrals if indicated
- Patient education points
- Red flags requiring immediate medical attention`,
};

// Actions that should return structured JSON output
const STRUCTURED_ACTIONS = new Set([
  'generate-soap',
  'discharge-summary',
  'follow-up-plan',
]);

// ── Clinical System Prompt ─────────────────────────────────

function buildSystemPrompt(patientContext, language = 'en') {
  const langName = LANGUAGE_MAP[language] || 'English';

  let systemPrompt = `You are an AI clinical assistant ("UrbanCare AI Copilot") helping a licensed medical professional in a hospital setting.

CORE RULES:
1. You assist doctors — never provide definitive diagnoses or prescriptions.
2. Provide clinical reasoning, differential considerations, and evidence-based suggestions only.
3. If uncertain about any clinical matter, explicitly say so.
4. Be medically precise and use proper clinical terminology when speaking to the doctor.
5. Always recommend verifying with clinical judgment, guidelines, and specialist consultation when appropriate.
6. Never fabricate lab values, imaging results, or clinical data not provided to you.

LANGUAGE RULES:
- The doctor's preferred language is: ${langName}.
- ALWAYS respond in ${langName}.
- If the doctor writes in a different language, auto-detect it and respond in THAT language instead.
- Maintain medical accuracy regardless of language.
- When translating medical concepts, use locally understood medical terminology.

STRUCTURED OUTPUT:
- When asked for SOAP notes, discharge summaries, or follow-up plans, return a JSON block wrapped in \`\`\`json ... \`\`\` markers.
- The JSON should follow the structure: { "summary": "", "clinicalReasoning": "", "recommendations": [], "warnings": [] }
- You may add extra fields as appropriate (e.g., "subjective", "objective", "assessment", "plan" for SOAP notes).
- For non-structured requests, respond in natural markdown.

SAFETY:
- Never suggest stopping prescribed medications without physician review.
- Always flag critical vital sign values.
- Include appropriate medical disclaimers.`;

  if (patientContext) {
    const ctx = patientContext;
    systemPrompt += `

CURRENT PATIENT CONTEXT:
- Patient ID: ${ctx.patientId || 'N/A'}
- Name: ${ctx.name || 'N/A'}
- Age: ${ctx.age || 'N/A'}
- Gender: ${ctx.gender || 'N/A'}
- Condition: ${ctx.condition || 'N/A'}
- Risk Level: ${ctx.riskLevel || 'N/A'}

VITAL SIGNS:
- Heart Rate: ${ctx.vitals?.heartRate || 'N/A'} BPM
- SpO2: ${ctx.vitals?.spo2 || 'N/A'}%
- Temperature: ${ctx.vitals?.temperature || 'N/A'} °F
- Respiration: ${ctx.vitals?.respiration || 'N/A'} /min
- Blood Pressure: ${ctx.vitals?.bloodPressure || 'N/A'}

${ctx.activeAlerts ? `ACTIVE ALERTS:\n${ctx.activeAlerts}` : 'No active alerts.'}

${ctx.notesSummary ? `CLINICAL NOTES SUMMARY:\n${ctx.notesSummary}` : ''}

Use this patient context to inform your responses. The doctor should NOT need to repeat patient information.`;
  }

  return systemPrompt;
}

// ── Trim history to last N messages ────────────────────────

function trimHistory(history, maxMessages = 20) {
  if (!Array.isArray(history) || history.length <= maxMessages) return history || [];
  return history.slice(-maxMessages);
}

// ── Main Chat Function ─────────────────────────────────────

/**
 * Send a message to the Gemini AI copilot with full patient context.
 *
 * @param {Object}   params
 * @param {string}   params.message        — Doctor's message or action prompt
 * @param {Object[]} [params.history]      — Chat history [{ role, content }]
 * @param {Object}   [params.patientContext] — Patient data for context injection
 * @param {string}   [params.language]     — Preferred language code (en, hi, bn, ta, es, ar)
 * @param {string}   [params.action]       — Quick action key (e.g. 'generate-soap')
 * @returns {Promise<Object>}
 */
async function consultChat({ message, history = [], patientContext, language = 'en', action }) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }

  // If an action was triggered, use the action prompt template
  let userMessage = message;
  let isStructuredRequest = false;

  if (action && ACTION_PROMPTS[action]) {
    userMessage = ACTION_PROMPTS[action];
    if (message && message.trim()) {
      userMessage += `\n\nAdditional context from doctor: ${message}`;
    }
    isStructuredRequest = STRUCTURED_ACTIONS.has(action);
  }

  // Build system prompt with patient context
  const systemInstruction = buildSystemPrompt(patientContext, language);

  // Trim history to prevent token overflow
  const trimmedHistory = trimHistory(history, 20);

  // Convert history to Gemini format
  const geminiHistory = trimmedHistory.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const chat = ai.chats.create({
      model: MODEL_ID,
      config: {
        systemInstruction,
        temperature: isStructuredRequest ? 0.2 : 0.4,
      },
      history: geminiHistory,
    });

    const result = await chat.sendMessage({ message: userMessage });
    const responseText = result.text || '';

    // Detect if response contains structured JSON
    const hasStructuredOutput = responseText.includes('```json');

    return {
      role: 'assistant',
      content: responseText,
      structured: hasStructuredOutput,
      language: language,
      action: action || null,
      model: MODEL_ID,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('❌ Gemini consult error:', err.message);

    // Provide a meaningful fallback
    if (err.message.includes('quota') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Rate limit reached. Please wait a moment before trying again.');
    }
    if (err.message.includes('API key') || err.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key configuration. Please check server settings.');
    }
    if (err.message.includes('not found') || err.message.includes('NOT_FOUND')) {
      throw new Error('AI model not available. Please check model configuration.');
    }
    throw new Error(`AI consultation failed: ${err.message}`);
  }
}

module.exports = { consultChat, ACTION_PROMPTS, LANGUAGE_MAP };
