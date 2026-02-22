// ──────────────────────────────────────────────────────────
// Text Model — TxGemma Adapter
// ──────────────────────────────────────────────────────────
//
// This module handles all text-to-text medical inference:
// SOAP notes, referral summaries, and conversational chat.
//
// Uses HuggingFace Inference API when HF_TOKEN is configured.
// Falls back to context-aware mock responses otherwise.
//
// Supported model slots:
//   • txgemma         — google/txgemma-9b-predict  (online)
//   • txgemma-offline — google/txgemma-2b-predict  (offline)
// ──────────────────────────────────────────────────────────

const hf = require('./huggingfaceClient');

const MODEL_REGISTRY = {
  txgemma: {
    id: 'google/txgemma-9b-predict',
    task: 'text-generation',
    description: 'Clinical text generation — SOAP notes, referrals, chat',
  },
  'txgemma-offline': {
    id: 'google/txgemma-2b-predict',
    task: 'text-generation',
    description: 'Lightweight clinical text generation — offline/local mode',
    offline: true,
  },
};

// ──────────────────────────────────────────────────────────
// SOAP Note Generation
// ──────────────────────────────────────────────────────────

/**
 * Generate a SOAP note from patient context.
 *
 * @param {Object}  params
 * @param {string}  params.patientName
 * @param {number}  params.age
 * @param {string}  params.gender
 * @param {string}  params.condition
 * @param {Object}  params.vitals      — { heartRate, spO2, temperature, respiration, bloodPressure }
 * @param {string}  [params.history]   — past medical history / chief complaint
 * @param {string}  [params.risk]      — risk level (Critical, Warning, Stable)
 * @param {string}  [params.notes]     — existing clinical notes
 * @param {string}  [params.section]   — specific section to generate (soap, hpi, assessment, plan)
 * @param {string}  [params.model]     — model slot (default: "txgemma")
 * @returns {Promise<Object>}
 */
async function generateSOAP({ patientName, age, gender, condition, vitals, history, risk, notes, section, model = 'txgemma' }) {
  const modelInfo = MODEL_REGISTRY[model];
  if (!modelInfo) throw new Error(`Unknown text model: "${model}"`);

  // ── Try real TxGemma inference ─────────────────────────────

  if (hf.isConfigured()) {
    try {
      const prompt = hf.buildSOAPPrompt({ patientName, age, gender, condition, vitals, history, risk, notes });

      const result = await hf.textGeneration(modelInfo.id, prompt, {
        maxTokens: 1024,
        temperature: 0.3,
        timeoutMs: 60000,
      });

      const parsed = hf.parseSOAPResponse(result.generated_text);

      // If a specific section was requested, return only that
      if (section && section !== 'soap' && parsed[section]) {
        return {
          section,
          content: parsed[section],
          model: modelInfo.id,
          timestamp: new Date().toISOString(),
          mock: false,
          source: 'huggingface',
        };
      }

      return {
        ...parsed,
        model: modelInfo.id,
        timestamp: new Date().toISOString(),
        mock: false,
        source: 'huggingface',
      };
    } catch (err) {
      console.warn(`  ⚠️ TxGemma SOAP inference failed, falling back to mock: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ HF_TOKEN not configured — using mock SOAP generation');
  }

  // ── Mock fallback ─────────────────────────────────────────

  const hr  = vitals?.heartRate || 78;
  const sp  = vitals?.spO2 || 97;
  const temp = vitals?.temperature || 98.4;
  const rr  = vitals?.respiration || 16;
  const bp  = vitals?.bloodPressure || { sys: 120, dia: 80 };
  const riskLevel = risk || 'Stable';
  const hx  = history || '';
  const clinicalNotes = notes || '';

  const isUnstable = riskLevel === 'Critical' || hr > 100 || sp < 94;
  const genderChar = gender?.[0] || '';

  // Vitals status helpers (no emojis, no decorative chars)
  const hrStatus = hr > 100 ? 'Tachycardic' : hr < 60 ? 'Bradycardic' : 'Normal';
  const bpStatus = bp.sys > 140 ? 'Hypertensive' : bp.sys < 90 ? 'Hypotensive' : 'Normal';
  const spStatus = sp < 94 ? 'Hypoxemic' : 'Normal';
  const tempStatus = temp > 100.4 ? 'Febrile' : 'Afebrile';
  const rrStatus = rr > 20 ? 'Tachypneic' : 'Normal';

  // Risk mapping
  const riskStrat = riskLevel === 'Critical' ? 'High' : riskLevel === 'Warning' ? 'Moderate' : 'Low';

  // Build each SOAP section — clean EHR format
  const subjective = [
    `- **Chief Complaint:** ${patientName} (${age}${genderChar}) presents with ${condition}.`,
    `- **History of Present Illness:** ${hx || 'Patient reports gradual onset of symptoms over the past 48 hours with progressive discomfort. No recent hospitalizations or surgical procedures noted.'}`,
    `- **Review of Systems:**`,
    `  - Constitutional: ${temp > 100.4 ? 'Reports fever and malaise' : 'Denies fever, chills, or weight changes'}`,
    `  - Cardiovascular: ${hr > 100 ? 'Reports palpitations' : 'Denies chest pain, dyspnea at rest, or syncope'}`,
    `  - Respiratory: ${sp < 94 ? 'Reports shortness of breath on exertion' : 'Denies cough, hemoptysis, or wheezing'}`,
    `  - Neurological: Denies headache, dizziness, or focal weakness`,
    clinicalNotes ? `\n- **Additional Context:** ${clinicalNotes}` : '',
  ].filter(Boolean).join('\n');

  const objective = [
    `### Vital Signs`,
    ``,
    `| Parameter | Value | Status |`,
    `|-----------|-------|--------|`,
    `| Heart Rate | ${hr} bpm | ${hrStatus} |`,
    `| Blood Pressure | ${bp.sys}/${bp.dia} mmHg | ${bpStatus} |`,
    `| SpO2 | ${sp}% | ${spStatus} |`,
    `| Temperature | ${temp} F | ${tempStatus} |`,
    `| Respiratory Rate | ${rr}/min | ${rrStatus} |`,
    ``,
    `### Physical Examination`,
    `- General: Patient appears ${isUnstable ? 'acutely ill, mildly diaphoretic' : 'alert, comfortable, in no acute distress'}. Oriented x3.`,
    `- HEENT: Normocephalic, atraumatic. PERRLA. Oropharynx clear.`,
    `- Cardiovascular: ${hr > 100 ? 'Tachycardic but regular rhythm' : 'Regular rate and rhythm'}, no murmurs, rubs, or gallops.`,
    `- Pulmonary: ${sp < 94 ? 'Diminished breath sounds at bases bilaterally' : 'Clear to auscultation bilaterally'}. No wheeze or crackles.`,
    `- Abdomen: Soft, non-tender, non-distended. Normal bowel sounds.`,
    `- Extremities: No clubbing, cyanosis, or edema.`,
  ].join('\n');

  // Build differential based on condition
  let differentials;
  if (condition.toLowerCase().includes('hypertension')) {
    differentials = `  - Essential hypertension\n  - Secondary hypertension (renal, endocrine)\n  - White-coat hypertension`;
  } else if (condition.toLowerCase().includes('pneumonia')) {
    differentials = `  - Community-acquired pneumonia\n  - Viral pneumonitis\n  - Acute bronchitis`;
  } else {
    differentials = `  - ${condition} (primary)\n  - Comorbid cardiovascular disease\n  - Metabolic derangement`;
  }

  const assessment = [
    `- **Primary Clinical Impression:** ${condition}`,
    `- **Current Status:** ${isUnstable ? 'Unstable, requires close monitoring' : 'Stable with controlled vitals'}`,
    `- **Risk Stratification:** ${riskStrat}`,
    `- **Differential Diagnosis:**`,
    differentials,
    ``,
    isUnstable
      ? `Clinical reasoning: Patient demonstrates hemodynamic instability with ${hr > 100 ? 'tachycardia' : ''}${sp < 94 ? (hr > 100 ? ' and hypoxemia' : 'hypoxemia') : ''}. Underlying etiology should be investigated. Escalation protocol may be warranted if no improvement within 2 hours.`
      : `Clinical reasoning: Patient is clinically stable with vitals within acceptable parameters. Current presentation is consistent with ${condition}. Continue current management plan with routine monitoring. Reassess if clinical status changes.`,
  ].join('\n');

  const plan = [
    `### Monitoring`,
    isUnstable
      ? `- Increase monitoring frequency to continuous telemetry\n- Reassess vitals every 1-2 hours`
      : `- Maintain standard vitals monitoring q4h\n- Reassess at next shift change`,
    sp < 94 ? `- Initiate supplemental O2 via nasal cannula 2-4 L/min, titrate to SpO2 > 94%` : '',
    hr > 100 ? `- IV fluid bolus 500mL NS if clinical signs of dehydration present` : '',
    ``,
    `### Medications`,
    `- Continue current medication regimen`,
    `- PRN analgesics as needed for pain management`,
    temp > 100.4 ? `- Antipyretic therapy (acetaminophen 650mg PO q6h PRN)` : '',
    ``,
    `### Diagnostics`,
    `- CBC, BMP, CMP as clinically indicated`,
    condition.toLowerCase().includes('pneumonia') ? `- Blood cultures x2, sputum culture and sensitivity` : `- Relevant labs as clinically indicated`,
    sp < 94 ? `- ABG if hypoxemia persists despite supplemental O2` : '',
    condition.toLowerCase().includes('cardiac') || hr > 100 ? `- Troponin, BNP, 12-lead ECG` : `- Additional labs per specialist recommendation`,
    ``,
    `### Follow-up`,
    `- Re-evaluate in ${isUnstable ? '2' : '4-6'} hours or sooner if clinical status changes`,
    riskLevel === 'Critical' ? `- Consider ICU transfer if no improvement` : `- Consult specialist if indicated`,
    `- Patient and family counseled regarding condition, plan, and expected course`,
    `- Document disposition decision by end of shift`,
    ``,
    `### Safety Considerations`,
    isUnstable
      ? `- Escalation triggers: worsening tachycardia, new-onset hypotension, declining SpO2, altered mental status\n- Notify attending physician immediately if any red flags develop`
      : `- No immediate red flags identified\n- Standard escalation protocols apply if clinical deterioration occurs`,
  ].filter(Boolean).join('\n');

  // If a specific section was requested, return just that section as a string
  const sections = { soap: null, subjective, objective, assessment, plan, hpi: subjective };
  if (section && section !== 'soap' && sections[section]) {
    return {
      section,
      content: sections[section],
      model: modelInfo.id,
      timestamp: new Date().toISOString(),
      mock: true,
    };
  }

  // Return full SOAP
  return {
    subjective,
    objective,
    assessment,
    plan,
    model: modelInfo.id,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

// ──────────────────────────────────────────────────────────
// Referral Summary Generation
// ──────────────────────────────────────────────────────────

/**
 * Generate a structured referral letter.
 *
 * @param {Object}  params
 * @param {Object}  params.patient      — { name, age, gender, condition, vitals }
 * @param {string}  params.referringDoctor
 * @param {string}  params.targetSpecialty
 * @param {string}  [params.reason]
 * @param {string}  [params.notes]
 * @param {string}  [params.model]
 * @returns {Promise<Object>}
 */
async function generateReferral({ patient, referringDoctor, targetSpecialty, reason, notes, model = 'txgemma' }) {
  const modelInfo = MODEL_REGISTRY[model];
  if (!modelInfo) throw new Error(`Unknown text model: "${model}"`);

  // ── Try real TxGemma inference ─────────────────────────────

  if (hf.isConfigured()) {
    try {
      const prompt = hf.buildReferralPrompt({ patient, referringDoctor, targetSpecialty, reason, notes });

      const result = await hf.textGeneration(modelInfo.id, prompt, {
        maxTokens: 768,
        temperature: 0.3,
        timeoutMs: 60000,
      });

      const text = result.generated_text;

      return {
        header: {
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          from: referringDoctor || 'Dr. Unknown',
          to: `${targetSpecialty || 'Specialist'} Department`,
          re: `Referral for ${patient?.name || 'Patient'}`,
        },
        body: {
          fullText: text,
          introduction: '',
          clinicalSummary: '',
          currentVitals: '',
          additionalNotes: notes || '',
          closing: '',
        },
        urgency: patient?.vitals?.heartRate > 100 || patient?.vitals?.spO2 < 94 ? 'urgent' : 'routine',
        model: modelInfo.id,
        timestamp: new Date().toISOString(),
        mock: false,
        source: 'huggingface',
      };
    } catch (err) {
      console.warn(`  ⚠️ TxGemma referral inference failed, falling back to mock: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ HF_TOKEN not configured — using mock referral generation');
  }

  // ── Mock fallback ─────────────────────────────────────────

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return {
    header: {
      date: today,
      from: referringDoctor || 'Dr. Unknown',
      to: `${targetSpecialty || 'Specialist'} Department`,
      re: `Referral for ${patient?.name || 'Patient'}`,
    },
    body: {
      introduction: `Dear Colleague,\n\nI am writing to refer ${patient?.name || 'the above patient'}, a ${patient?.age || '--'}-year-old ${patient?.gender || 'patient'}, for evaluation and management of ${patient?.condition || 'their current condition'}.`,
      clinicalSummary: `The patient has been under my care with a primary diagnosis of ${patient?.condition || 'N/A'}. ${reason || 'Further specialist evaluation is recommended based on clinical findings.'}`,
      currentVitals: patient?.vitals
        ? `Current vitals — HR: ${patient.vitals.heartRate || '--'} bpm, SpO2: ${patient.vitals.spO2 || '--'}%, Temp: ${patient.vitals.temperature || '--'}°F, RR: ${patient.vitals.respiration || '--'}/min.`
        : 'Vitals not available at this time.',
      additionalNotes: notes || 'No additional notes provided.',
      closing: `Thank you for your prompt attention to this referral. Please do not hesitate to contact me for further information.\n\nSincerely,\n${referringDoctor || 'Referring Physician'}`,
    },
    urgency: patient?.vitals?.heartRate > 100 || patient?.vitals?.spO2 < 94 ? 'urgent' : 'routine',
    model: modelInfo.id,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

// ──────────────────────────────────────────────────────────
// AI Assistant Chat
// ──────────────────────────────────────────────────────────

/**
 * Conversational AI assistant for doctors.
 *
 * @param {Object}   params
 * @param {string}   params.message          — User's question
 * @param {Object[]} [params.history]        — Prior messages [{ role, content }]
 * @param {Object}   [params.patientContext] — Current patient data for context
 * @param {string}   [params.model]
 * @returns {Promise<Object>}
 */
async function chat({ message, history = [], patientContext, model = 'txgemma' }) {
  const modelInfo = MODEL_REGISTRY[model];
  if (!modelInfo) throw new Error(`Unknown text model: "${model}"`);

  // ── Try real TxGemma inference ─────────────────────────────

  if (hf.isConfigured()) {
    try {
      const prompt = hf.buildChatPrompt(message, patientContext);

      const result = await hf.textGeneration(modelInfo.id, prompt, {
        maxTokens: 512,
        temperature: 0.5,
        timeoutMs: 30000,
      });

      return {
        role: 'assistant',
        content: result.generated_text,
        model: modelInfo.id,
        conversationLength: history.length + 2,
        timestamp: new Date().toISOString(),
        mock: false,
        source: 'huggingface',
      };
    } catch (err) {
      console.warn(`  ⚠️ TxGemma chat inference failed, falling back to mock: ${err.message}`);
    }
  } else {
    console.log('  ℹ️ HF_TOKEN not configured — using mock chat');
  }

  // ── Mock fallback ─────────────────────────────────────────

  const lowerMsg = message.toLowerCase();

  // Context-aware mock responses
  let reply;

  if (lowerMsg.includes('dose') || lowerMsg.includes('dosage') || lowerMsg.includes('medication')) {
    reply = `Based on current clinical guidelines, dosage recommendations should be individualized. ${patientContext?.name ? `For ${patientContext.name} (${patientContext.age}y, ${patientContext.condition}), ` : ''}please consult UpToDate or the relevant formulary for weight-based and renal-adjusted dosing. I recommend verifying with your hospital pharmacy system.`;
  } else if (lowerMsg.includes('differential') || lowerMsg.includes('diagnosis')) {
    const condition = patientContext?.condition || 'the presenting symptoms';
    reply = `For ${condition}, consider the following differentials:\n\n1. **Primary diagnosis** — ${condition}\n2. **Secondary** — Comorbid conditions (cardiovascular, metabolic)\n3. **Must-rule-out** — Sepsis, PE, or ACS depending on acuity\n\nCorrelate with labs (CBC, BMP, troponin, D-dimer) and imaging as indicated.`;
  } else if (lowerMsg.includes('vitals') || lowerMsg.includes('vital signs')) {
    if (patientContext?.vitals) {
      const v = patientContext.vitals;
      reply = `Current vitals for ${patientContext.name || 'the patient'}:\n- **HR:** ${v.heartRate || '--'} bpm\n- **SpO2:** ${v.spO2 || '--'}%\n- **Temp:** ${v.temperature || '--'}°F\n- **RR:** ${v.respiration || '--'}/min\n\n${v.heartRate > 100 ? '⚠️ Tachycardia noted — consider fluid status and telemetry.' : 'Vitals within acceptable range.'}`;
    } else {
      reply = 'No patient context provided. Please select a patient to view their vitals.';
    }
  } else if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
    reply = "I'm your clinical AI assistant. I can help with:\n\n• **Differential diagnoses** — ask about a condition\n• **Medication guidance** — dosage and interaction questions\n• **Vitals interpretation** — when patient is selected\n• **Clinical protocols** — standard care guidelines\n• **Documentation** — SOAP notes and referral help\n\nAll responses are suggestions and should be verified with clinical judgment.";
  } else {
    reply = `Thank you for your question. Regarding "${message.slice(0, 80)}${message.length > 80 ? '…' : ''}":\n\nThis is a mock response from the UrbanCare AI assistant. When the TxGemma model is connected, you'll receive evidence-based clinical guidance here.\n\n⚕️ *Always verify AI suggestions with clinical judgment and current guidelines.*`;
  }

  return {
    role: 'assistant',
    content: reply,
    model: modelInfo.id,
    conversationLength: history.length + 2,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

module.exports = { generateSOAP, generateReferral, chat, MODEL_REGISTRY };
