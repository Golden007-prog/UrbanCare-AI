// ──────────────────────────────────────────────────────────
// TxGemma Client — HuggingFace Inference Endpoint
// ──────────────────────────────────────────────────────────
//
// Calls the deployed TxGemma endpoint for clinical reasoning.
// Falls back to Gemini Flash if TxGemma is unreachable.
//
// Endpoint: TXGEMMA_ENDPOINT (env)
// Auth:     HF_TOKEN (Bearer)
// Timeout:  60 seconds
// Retries:  2 (exponential backoff)
// ──────────────────────────────────────────────────────────

const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const TXGEMMA_ENDPOINT = process.env.TXGEMMA_ENDPOINT;
const HF_TOKEN = process.env.HF_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TXGEMMA_TIMEOUT = 60000; // 60s
const MAX_RETRIES = 2;

// ── Parse TxGemma response into structured JSON ───────────

function parseToStructured(rawText) {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(rawText);
    if (parsed.summary || parsed.differential || parsed.recommended_action) {
      return parsed;
    }
  } catch (_) { /* not JSON, parse manually */ }

  // Try extracting JSON block
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (_) { /* malformed JSON block */ }
  }

  // Parse prose into structured format
  const lines = rawText.split('\n').filter(l => l.trim());
  const differential = [];
  const recommendations = [];

  let currentSection = '';
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('differential') || lower.includes('diagnosis')) {
      currentSection = 'differential';
    } else if (lower.includes('recommend') || lower.includes('action') || lower.includes('plan')) {
      currentSection = 'recommendation';
    } else if (currentSection === 'differential' && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
      differential.push(line.replace(/^[-•\d.)\s]+/, '').trim());
    } else if (currentSection === 'recommendation' && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
      recommendations.push(line.replace(/^[-•\d.)\s]+/, '').trim());
    }
  }

  return {
    summary: lines.slice(0, 3).join(' ').substring(0, 500),
    differential: differential.length > 0 ? differential : ['See full reasoning below'],
    recommended_action: recommendations.length > 0 ? recommendations.join('; ') : 'Review clinical context and apply clinical judgment.',
    risk_level: rawText.toLowerCase().includes('critical') ? 'high'
      : rawText.toLowerCase().includes('warning') || rawText.toLowerCase().includes('concern') ? 'moderate'
      : 'low',
    confidence: 0.7,
    raw_text: rawText,
  };
}

// ── Call TxGemma with retries ─────────────────────────────

async function callTxGemma(contextJson) {
  if (!TXGEMMA_ENDPOINT || !HF_TOKEN) {
    console.warn('  ⚠️ TxGemma not configured, using Gemini fallback');
    return callGeminiFallback(contextJson);
  }

  const prompt = typeof contextJson === 'string' ? contextJson : JSON.stringify(contextJson, null, 2);

  const clinicalPrompt = `You are a clinical reasoning AI assistant. Analyze the following patient context and doctor's question. Provide structured clinical reasoning.

${prompt}

Respond in JSON format:
{
  "summary": "Brief clinical summary",
  "differential": ["diagnosis 1", "diagnosis 2"],
  "recommended_action": "Recommended next steps",
  "risk_level": "low|moderate|high|critical",
  "confidence": 0.0-1.0
}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  🧬 TxGemma call attempt ${attempt + 1}/${MAX_RETRIES + 1}...`);

      const response = await axios.post(
        TXGEMMA_ENDPOINT,
        { inputs: clinicalPrompt },
        {
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: TXGEMMA_TIMEOUT,
        }
      );

      let rawText = '';
      if (Array.isArray(response.data)) {
        rawText = response.data[0]?.generated_text || response.data[0]?.text || JSON.stringify(response.data);
      } else if (typeof response.data === 'string') {
        rawText = response.data;
      } else if (response.data?.generated_text) {
        rawText = response.data.generated_text;
      } else if (response.data?.[0]?.generated_text) {
        rawText = response.data[0].generated_text;
      } else {
        rawText = JSON.stringify(response.data);
      }

      console.log('  ✅ TxGemma responded');
      const structured = parseToStructured(rawText);
      return { ...structured, source: 'txgemma', mock: false };
    } catch (err) {
      console.warn(`  ⚠️ TxGemma attempt ${attempt + 1} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`  ⏳ Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted — fallback to Gemini
  console.log('  🔄 TxGemma exhausted retries, falling back to Gemini');
  return callGeminiFallback(contextJson);
}

// ── Gemini Fallback for Medical Reasoning ─────────────────

async function callGeminiFallback(contextJson) {
  if (!GEMINI_API_KEY) {
    return {
      summary: 'Clinical reasoning unavailable — both TxGemma and Gemini are not configured.',
      differential: [],
      recommended_action: 'Please check server configuration.',
      risk_level: 'unknown',
      confidence: 0,
      source: 'fallback',
      mock: true,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = typeof contextJson === 'string' ? contextJson : JSON.stringify(contextJson, null, 2);

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a clinical reasoning AI assistant. Analyze the following patient context and provide structured clinical reasoning.

${prompt}

Respond in JSON format:
{
  "summary": "Brief clinical summary",
  "differential": ["diagnosis 1", "diagnosis 2"],
  "recommended_action": "Recommended next steps",
  "risk_level": "low|moderate|high|critical",
  "confidence": 0.0-1.0
}`,
      config: { temperature: 0.2 },
    });

    const text = result.text || '';
    const structured = parseToStructured(text);
    return { ...structured, source: 'gemini-fallback', mock: false };
  } catch (err) {
    console.error('  ❌ Gemini fallback also failed:', err.message);
    return {
      summary: 'Clinical reasoning temporarily unavailable.',
      differential: [],
      recommended_action: 'Please try again later.',
      risk_level: 'unknown',
      confidence: 0,
      source: 'error',
      mock: true,
    };
  }
}

// ── Analyze Patient Report for Intake Pipeline ────────────

async function analyzePatientReport(reportText, patientContext = {}) {
  const { age, gender, condition } = patientContext;

  const prompt = `You are a clinical AI assistant analyzing a patient's medical document.

Patient Context:
- Age: ${age || 'Unknown'}
- Gender: ${gender || 'Unknown'}
- Known Condition: ${condition || 'None reported'}

Document Content:
${reportText}

Analyze this document and return a JSON response with:
{
  "summary": "Brief summary of the document findings",
  "medications": ["List of medications mentioned"],
  "diagnosis": "Primary diagnosis or findings",
  "risks": ["List of identified risk factors"],
  "test_results": [{"test": "name", "value": "result", "status": "normal|abnormal|critical"}],
  "recommendations": "Recommended follow-up actions"
}

Respond ONLY with valid JSON.`;

  try {
    const result = await callTxGemma(prompt);
    
    // Ensure the result has our expected structure
    return {
      summary: result.summary || 'Analysis complete.',
      medications: result.medications || result.differential || [],
      diagnosis: result.diagnosis || result.recommended_action || '',
      risks: result.risks || [],
      test_results: result.test_results || [],
      recommendations: result.recommendations || result.recommended_action || '',
      risk_level: result.risk_level || 'low',
      confidence: result.confidence || 0.7,
      source: result.source || 'txgemma',
      mock: result.mock || false,
    };
  } catch (err) {
    console.error('❌ Patient report analysis failed:', err.message);
    return {
      summary: 'Document received. AI analysis temporarily unavailable.',
      medications: [],
      diagnosis: '',
      risks: [],
      test_results: [],
      recommendations: 'Please review manually.',
      risk_level: 'unknown',
      confidence: 0,
      source: 'error',
      mock: true,
    };
  }
}

module.exports = { callTxGemma, parseToStructured, analyzePatientReport };
