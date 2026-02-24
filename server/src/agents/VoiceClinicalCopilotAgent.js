// ──────────────────────────────────────────────────────────
// Voice Clinical Copilot Agent
// ──────────────────────────────────────────────────────────
//
// Main orchestration agent for the voice copilot pipeline:
//
//   1. STT  — Gemini Flash transcribes doctor audio
//   2. Context — contextBuilder assembles patient data
//   3. TxGemma — clinical reasoning from TxGemma endpoint
//   4. Rewrite — Gemini rewrites for natural spoken delivery
//   5. TTS  — text-to-speech (browser-side via Web Speech API)
//   6. Save — persist chat to voice_chat_history
//   7. Return — transcript + reasoning + spoken reply
//
// Fallbacks:
//   TxGemma fails → Gemini medical reasoning
//   Gemini fails  → text-only response
//
// Timeouts: TxGemma 60s, Gemini 30s
// ──────────────────────────────────────────────────────────

const { GoogleGenAI } = require('@google/genai');
const { query } = require('../config/db');
const { callTxGemma } = require('../services/txgemmaClient');
const { buildPatientContext, saveToMemory } = require('./contextBuilder');
const { VOICE_SYSTEM_PROMPT, CLINICAL_SYSTEM_PROMPT } = require('../config/clinicalSystemPrompt');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TIMEOUT = 30000;

// ── 1. Speech-to-Text via Gemini Multimodal ───────────────

async function transcribeAudio(audioBase64, mimeType = 'audio/webm') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  console.log('  🎙️ Transcribing audio via Gemini...');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          {
            text: 'Transcribe this audio exactly. The speaker is a medical doctor discussing a patient case. Return ONLY the transcription text, nothing else.',
          },
        ],
      },
    ],
    config: { temperature: 0.1 },
  });

  const transcript = (result.text || '').trim();
  console.log(`  ✅ Transcript: "${transcript.substring(0, 80)}${transcript.length > 80 ? '...' : ''}"`);
  return transcript;
}

// ── 4. Conversational Rewrite via Gemini ──────────────────

async function rewriteForSpeech(clinicalReasoning) {
  if (!GEMINI_API_KEY) {
    return clinicalReasoning.summary || JSON.stringify(clinicalReasoning);
  }

  console.log('  🔄 Rewriting for natural speech...');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const reasoningText = typeof clinicalReasoning === 'string'
    ? clinicalReasoning
    : JSON.stringify(clinicalReasoning, null, 2);

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${VOICE_SYSTEM_PROMPT}

Rewrite the following clinical analysis into a concise, spoken clinical summary for a physician colleague. Maintain medical terminology. Do NOT simplify for patients. Do NOT address any patient directly. Structure as: Findings, Impression, Recommendation. Be brief and professional — no bullet points or markdown, use flowing spoken paragraphs.

Clinical Analysis:
${reasoningText}

Spoken clinical summary:`,
    config: { temperature: 0.3 },
  });

  const spoken = (result.text || '').trim();
  console.log(`  ✅ Spoken rewrite: ${spoken.length} chars`);
  return spoken;
}

// ── 6. Save Chat Messages to DB ───────────────────────────

async function saveChatMessage(patientId, doctorId, role, messageText, audioUrl = null) {
  try {
    await query(
      `INSERT INTO voice_chat_history (patient_id, doctor_id, role, message_text, audio_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, doctorId, role, messageText, audioUrl]
    );
    console.log(`  💾 Saved ${role} message to voice_chat_history`);
  } catch (err) {
    console.warn('  ⚠️ Failed to save chat message:', err.message);
  }
}

// ── Main Pipeline ─────────────────────────────────────────

/**
 * Process a voice message through the full pipeline.
 *
 * @param {Object} params
 * @param {string} params.audioBase64 — base64-encoded audio
 * @param {string} params.patientId   — patient identifier
 * @param {string} params.doctorId    — doctor user ID
 * @param {string} [params.mimeType]  — audio MIME type
 * @param {Object} [params.patientContext] — extra context from frontend
 * @returns {Object} { transcript, clinicalReasoning, spokenReply, source }
 */
async function processVoiceMessage({ audioBase64, patientId, doctorId, mimeType = 'audio/webm', patientContext = {} }) {
  const startTime = Date.now();

  // Step 1: Transcribe audio
  let transcript;
  try {
    transcript = await transcribeAudio(audioBase64, mimeType);
  } catch (err) {
    console.error('  ❌ STT failed:', err.message);
    throw new Error(`Speech-to-text failed: ${err.message}`);
  }

  if (!transcript || transcript.length < 2) {
    return {
      transcript: '',
      clinicalReasoning: null,
      spokenReply: 'I couldn\'t hear anything clearly. Could you please repeat that?',
      source: 'no-audio',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Step 2: Build clinical context
  let context;
  try {
    context = await buildPatientContext(patientId, transcript, patientContext);
  } catch (err) {
    console.warn('  ⚠️ Context build partial failure:', err.message);
    context = {
      patient_info: { id: patientId, ...patientContext },
      doctor_question: transcript,
    };
  }

  // Step 3: Clinical reasoning via TxGemma (with fallback)
  let clinicalReasoning;
  try {
    clinicalReasoning = await callTxGemma(context);
  } catch (err) {
    console.error('  ❌ Clinical reasoning failed:', err.message);
    clinicalReasoning = {
      summary: 'Clinical reasoning temporarily unavailable.',
      differential: [],
      recommended_action: 'Please try again or consult directly.',
      risk_level: 'unknown',
      confidence: 0,
      source: 'error',
      mock: true,
    };
  }

  // Step 4: Rewrite for natural speech
  let spokenReply;
  try {
    spokenReply = await rewriteForSpeech(clinicalReasoning);
  } catch (err) {
    console.warn('  ⚠️ Rewrite failed, using raw summary:', err.message);
    spokenReply = clinicalReasoning.summary || 'I was unable to generate a response. Please try again.';
  }

  // Step 5: Save both messages to DB (fire-and-forget)
  saveChatMessage(patientId, doctorId, 'doctor', transcript).catch(() => {});
  saveChatMessage(patientId, doctorId, 'assistant', spokenReply).catch(() => {});

  // Step 6: Save the reasoning as a memory vector for future context
  if (clinicalReasoning && !clinicalReasoning.mock) {
    saveToMemory(patientId, `Q: ${transcript}\nA: ${clinicalReasoning.summary}`, 'notes').catch(() => {});
  }

  const processingTimeMs = Date.now() - startTime;
  console.log(`  ⏱️ Voice pipeline completed in ${processingTimeMs}ms`);

  return {
    transcript,
    clinicalReasoning,
    spokenReply,
    source: clinicalReasoning.source || 'txgemma',
    processingTimeMs,
  };
}

// ── Text Message Pipeline (no audio) ──────────────────────

async function processTextMessage({ message, patientId, doctorId, patientContext = {} }) {
  const startTime = Date.now();

  // Build context
  let context;
  try {
    context = await buildPatientContext(patientId, message, patientContext);
  } catch (err) {
    context = {
      patient_info: { id: patientId, ...patientContext },
      doctor_question: message,
    };
  }

  // Clinical reasoning
  let clinicalReasoning;
  try {
    clinicalReasoning = await callTxGemma(context);
  } catch (err) {
    clinicalReasoning = {
      summary: 'Clinical reasoning temporarily unavailable.',
      differential: [],
      recommended_action: 'Please try again.',
      risk_level: 'unknown',
      confidence: 0,
      source: 'error',
      mock: true,
    };
  }

  // Rewrite
  let spokenReply;
  try {
    spokenReply = await rewriteForSpeech(clinicalReasoning);
  } catch (err) {
    spokenReply = clinicalReasoning.summary || 'Unable to generate response.';
  }

  // Save
  saveChatMessage(patientId, doctorId, 'doctor', message).catch(() => {});
  saveChatMessage(patientId, doctorId, 'assistant', spokenReply).catch(() => {});

  if (clinicalReasoning && !clinicalReasoning.mock) {
    saveToMemory(patientId, `Q: ${message}\nA: ${clinicalReasoning.summary}`, 'notes').catch(() => {});
  }

  return {
    transcript: message,
    clinicalReasoning,
    spokenReply,
    source: clinicalReasoning.source || 'txgemma',
    processingTimeMs: Date.now() - startTime,
  };
}

// ── Get Chat History ──────────────────────────────────────

async function getHistory(patientId, limit = 50) {
  try {
    const result = await query(
      `SELECT id, patient_id, doctor_id, role, message_text, audio_url, created_at
       FROM voice_chat_history
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [patientId, limit]
    );
    return result.rows;
  } catch (err) {
    console.error('  ❌ Failed to fetch voice history:', err.message);
    return [];
  }
}

// ── Delete Expired Chats ──────────────────────────────────

async function deleteExpiredChats() {
  try {
    const result = await query(
      'DELETE FROM voice_chat_history WHERE expires_at < NOW()'
    );
    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`  🗑️ Deleted ${count} expired voice chat records`);
    }
    return count;
  } catch (err) {
    console.error('  ❌ Failed to delete expired chats:', err.message);
    return 0;
  }
}

// ── Delete Specific Chat ──────────────────────────────────

async function deleteChat(chatId) {
  try {
    const result = await query(
      'DELETE FROM voice_chat_history WHERE id = $1',
      [chatId]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error('  ❌ Failed to delete chat:', err.message);
    return false;
  }
}

module.exports = {
  processVoiceMessage,
  processTextMessage,
  getHistory,
  deleteExpiredChats,
  deleteChat,
  transcribeAudio,
  rewriteForSpeech,
};
