const { callTxGemma, parseToStructured } = require('./txgemmaClient');
const { GoogleGenAI } = require('@google/genai');
const { CLINICAL_SYSTEM_PROMPT, RADIOLOGY_JSON_TEMPLATE } = require('../config/clinicalSystemPrompt');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Takes the raw output from multiple MedGemma crop analyses, combines them with
 * the patient history and the doctor's specific question, and synthesizes a
 * final, confident clinical recommendation using TxGemma (or Gemini fallback).
 *
 * @param {Object} params
 * @param {Array} params.medgemmaResults - Structured JSON results from all crops
 * @param {Object} params.patient - Patient profile and vitals
 * @param {string} params.voiceQuestion - The clinician's spoken / text query
 * @returns {Promise<Object>} Structured clinical reasoning
 */
async function synthesizeXRayReasoning({ medgemmaResults, patient, voiceQuestion }) {
  // 1. Compile the evidence into a single prompt for the reasoner
  
  let evidenceText = `### Radiological Findings (MedGemma)\n`;
  
  if (!medgemmaResults || medgemmaResults.length === 0) {
    evidenceText += "No detailed findings available. Base reasoning solely on the image and context.\n";
  } else {
    medgemmaResults.forEach((res, i) => {
      evidenceText += `\nRegion ${i+1}:\n`;
      if (res.success && res.findings) {
        evidenceText += `- Findings: ${res.findings.findings}\n`;
        if (res.findings.fracture_detected) {
          evidenceText += `- **FRACTURE DETECTED**: ${res.findings.fracture_type} at ${res.findings.fracture_location} (Confidence: ${res.findings.confidence})\n`;
          evidenceText += `- Displacement: ${res.findings.displacement}, Joint Involvement: ${res.findings.joint_involvement ? 'Yes' : 'No'}\n`;
        }
      } else {
        evidenceText += `- Analysis failed: ${res.error}\n`;
      }
    });
  }

  const patientContext = patient 
    ? `### Patient Context\nName: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}\nKnown Condition: ${patient.condition}\nVitals: HR ${patient.vitals?.heartRate?.value}, SpO2 ${patient.vitals?.spO2?.value}%\n`
    : `### Patient Context\nNot provided.\n`;

  const questionContext = voiceQuestion 
    ? `### Doctor's Specific Question\n"${voiceQuestion}"\n`
    : `### Doctor's Request\n"Analyze this X-ray and summarize the findings and recommendations."\n`;


  const fullPrompt = `${CLINICAL_SYSTEM_PROMPT}

You are provided with radiological findings extracted by a vision model (MedGemma) from various regions of an X-ray. Synthesize these into a cohesive clinical assessment for the consulting physician.

${patientContext}
${evidenceText}
${questionContext}

Provide a structured radiology-style response.

${RADIOLOGY_JSON_TEMPLATE}`;

  // 2. We use our existing TxGemma client which already handles retries and Gemini fallbacks.
  console.log(`  🧠 TxGemma synthesising findings from ${medgemmaResults?.length || 0} regions...`);
  
  try {
    const result = await callTxGemma(fullPrompt);
    return result;
  } catch (error) {
    console.error("  ❌ TxGemma reasoning failed:", error);
    
    // In worst-case fallback, we manually structure what we know
    let hasFracture = false;
    if (medgemmaResults) {
      hasFracture = medgemmaResults.some(r => r.success && r.findings?.fracture_detected);
    }
    
    return {
      summary: "Reasoning model unavailable. " + (hasFracture ? "A potential fracture was detected by the imaging model." : "Imaging model analysis returned findings, manual review required."),
      differential: hasFracture ? ["Possible fracture - review imaging"] : [],
      recommended_action: "Examine the generated findings and images manually.",
      risk_level: hasFracture ? "moderate" : "low",
      confidence: 0,
      source: "error",
      mock: true
    };
  }
}

module.exports = { synthesizeXRayReasoning };
