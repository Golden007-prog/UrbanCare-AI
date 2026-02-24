// ──────────────────────────────────────────────────────────
// XRayFractureAgent — Production-grade fracture analysis
// ──────────────────────────────────────────────────────────
//
// Architecture: Controller → YOLO crop → MedGemma → Parser → UI
//
// Features:
//   • Gradio Client for YOLO inference
//   • Local Sharp cropping
//   • Axios with 60 s timeout for MedGemma Inference
//   • 2 automatic retries on timeout / 503
//   • Deterministic fallback (never crashes)
//   • Strict JSON system prompt (temperature 0.1)
// ──────────────────────────────────────────────────────────

require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { Client, handle_file } = require('@gradio/client');

// ── Config ────────────────────────────────────────────────

const HF_MEDGEMMA_URL = process.env.HF_MEDGEMMA_URL || process.env.MEDGEMMA_ENDPOINT || '';
const HF_TOKEN        = process.env.HF_TOKEN || '';
const TIMEOUT_MS      = 60_000;
const MAX_RETRIES     = 2;

// ── Fallback response (returned when model is unavailable) ─

const FALLBACK_RESPONSE = {
  image_type: 'hand_xray',
  region_focus: 'unknown',
  findings: 'Model unavailable',
  fracture_detected: false,
  fracture_type: 'none',
  fracture_location: '',
  displacement: 'none',
  joint_involvement: false,
  confidence: 0,
  clinical_recommendation: 'Retry',
};

// ── System + User prompts ─────────────────────────────────

const SYSTEM_PROMPT = `You are a medical imaging AI specialized in fracture detection.
Analyze ONLY the selected region.
Return STRICT JSON.
Never return markdown.
Never explain outside JSON.`;

function buildUserPrompt(region) {
  return `Analyze this X-ray region for fractures.

Return JSON:

{
  "image_type": "hand_xray",
  "region_focus": "${region || 'unknown'}",
  "findings": "",
  "fracture_detected": true or false,
  "fracture_type": "transverse | oblique | spiral | comminuted | none",
  "fracture_location": "",
  "displacement": "none | mild | moderate | severe",
  "joint_involvement": true or false,
  "confidence": 0 to 1,
  "clinical_recommendation": ""
}`;
}

// ── YOLO Object Detection ─────────────────────────────────

async function getBoundingBoxes(imageBase64) {
  if (!HF_TOKEN) {
    console.warn('  ⚠️ HF_TOKEN not configured — skipping YOLO');
    return [];
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');
  
  // Write to temporary file for Gradio client
  const tmpFilePath = path.join(os.tmpdir(), `yolo-input-${Date.now()}.jpg`);
  await fs.promises.writeFile(tmpFilePath, imageBuffer);

  try {
    console.time('yolo_predict');
    const client = await Client.connect("Golden007/yolo-xray-detector", { hf_token: HF_TOKEN });
    const result = await client.predict("/predict", [
      handle_file(tmpFilePath)
    ]);
    console.timeEnd('yolo_predict');

    await fs.promises.unlink(tmpFilePath).catch(() => {});

    let bboxes = [];
    if (result.data && Array.isArray(result.data)) {
       // result.data[0] might be the stringified JSON or an array of objects
       const firstOut = result.data[0];
       if (typeof firstOut === 'string') {
         try {
           bboxes = JSON.parse(firstOut);
         } catch(e) {}
       } else if (Array.isArray(firstOut)) {
         bboxes = firstOut;
       }
    }
    
    return bboxes;
  } catch(err) {
    if (console.timeEnd) {
      try { console.timeEnd('yolo_predict'); } catch(e) {}
    }
    console.error('  ❌ YOLO detection failed:', err.message);
    await fs.promises.unlink(tmpFilePath).catch(() => {});
    return [];
  }
}

// ── Crop Image Given Bounding Box ──────────────────────────

async function cropImage(imageBase64, bbox) {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');
  
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width: imgW, height: imgH } = metadata;
    
    let left = Math.max(0, Math.floor(bbox.xmin));
    let top = Math.max(0, Math.floor(bbox.ymin));
    let width = Math.floor(bbox.xmax - bbox.xmin);
    let height = Math.floor(bbox.ymax - bbox.ymin);

    // clamp
    if (left + width > imgW) width = Math.max(1, imgW - left);
    if (top + height > imgH) height = Math.max(1, imgH - top);
    if (width <= 0 || height <= 0) return null;

    const cropBuffer = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .toBuffer();
    
    return cropBuffer.toString('base64');
  } catch(err) {
    console.error('  ❌ Image crop failed:', err.message);
    return null;
  }
}

// ── Call MedGemma with retry ──────────────────────────────

async function callMedGemma(imageBase64, region) {
  if (!HF_MEDGEMMA_URL || !HF_TOKEN) {
    console.warn('  ⚠️ HF_MEDGEMMA_URL or HF_TOKEN not configured — using fallback');
    return null;
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(region)}`;

  const payload = {
    inputs: `User: ${prompt}\nAssistant:`,
    image: cleanBase64,
    parameters: {
      max_new_tokens: 500,
      temperature: 0.1,
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = attempt * 2000;
        console.log(`  🔄 Retry ${attempt}/${MAX_RETRIES} after ${backoffMs}ms backoff...`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      console.time('medgemma');
      const response = await fetch(HF_MEDGEMMA_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      console.timeEnd('medgemma');

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.message = errorText;
        throw error;
      }

      const data = await response.json();
      console.log(`  ✅ MedGemma responded (attempt ${attempt + 1})`);
      return data;
    } catch (err) {
      try { console.timeEnd('medgemma'); } catch(e) {}

      const status = err.status;
      const isRetryable =
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        status === 503 ||
        status === 504 ||
        status === 429;

      console.warn(
        `  ⚠️ MedGemma attempt ${attempt + 1} failed: ${err.message}` +
          (status ? ` (HTTP ${status})` : ''),
      );

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error('  ❌ All MedGemma attempts exhausted — using fallback');
        return null;
      }
    }
  }

  return null;
}

// ── Parse HF response into structured JSON ───────────────

function parseResponse(raw) {
  try {
    const output = Array.isArray(raw) ? raw[0] : raw;
    let text = output?.generated_text || output?.text || (typeof output === 'string' ? output : '');

    const marker = 'Assistant:';
    const idx = text.lastIndexOf(marker);
    if (idx !== -1) {
      text = text.slice(idx + marker.length).trim();
    }

    const nextUser = text.indexOf('\nUser:');
    if (nextUser !== -1) {
      text = text.slice(0, nextUser).trim();
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('  ⚠️ No JSON object found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      parsed.fracture_detected === undefined ||
      parsed.fracture_type === undefined ||
      parsed.confidence === undefined
    ) {
      console.warn('  ⚠️ Response missing required keys (fracture_detected, fracture_type, confidence)');
      return null;
    }

    return {
      image_type: parsed.image_type || 'hand_xray',
      region_focus: parsed.region_focus || 'unknown',
      findings: parsed.findings || '',
      fracture_detected: !!parsed.fracture_detected,
      fracture_type: parsed.fracture_type || 'none',
      fracture_location: parsed.fracture_location || '',
      displacement: parsed.displacement || 'none',
      joint_involvement: !!parsed.joint_involvement,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      clinical_recommendation: parsed.clinical_recommendation || '',
    };
  } catch (err) {
    console.warn('  ⚠️ JSON parse failed:', err.message);
    return null;
  }
}

// ── Main entry point ──────────────────────────────────────

/**
 * Analyze an X-ray region for fractures (Hybrid Architecture).
 *
 * @param {string} imageBase64 — full image (data URI or raw base64)
 * @param {string|object} region — region identifier or selection coords
 * @returns {Promise<object>} — always returns structured JSON, never throws
 */
async function analyzeRegion(imageBase64, region) {
  const defaultRegionLabel = typeof region === 'string' ? region : region?.label || 'selected_region';

  console.log(`\n  🦴 XRayFractureAgent.analyzeRegion — Starting Hybrid Pipeline`);

  // Step 1: YOLO Detection
  const bboxes = await getBoundingBoxes(imageBase64);
  
  // If no bounding boxes, fallback to analyzing the whole image
  if (!bboxes || bboxes.length === 0) {
    console.log('  ⚠️ YOLO detected no regions or failed, analyzing whole image');
    const raw = await callMedGemma(imageBase64, defaultRegionLabel);
    if (raw) {
      const parsed = parseResponse(raw);
      if (parsed) {
        return { ...parsed, mock: false, source: 'medgemma-whole-image' };
      }
    }
    console.log('  📦 Returning fallback response');
    return { ...FALLBACK_RESPONSE, region_focus: defaultRegionLabel, mock: true, source: 'fallback' };
  }

  // Step 2 & 3: Crop & Convert
  console.log(`  ✂️ Cropping ${bboxes.length} bounding boxes...`);
  
  let aggregatedFindings = [];
  let overallFracture = false;
  let allRaw = [];
  let highestConfidence = 0;
  
  // Step 4: Iteratively send to MedGemma
  for (let i = 0; i < bboxes.length; i++) {
    const bbox = bboxes[i];
    const cropBase64 = await cropImage(imageBase64, bbox);
    if (!cropBase64) continue;
    
    console.log(`  🦴 Sending Crop ${i+1}/${bboxes.length} to MedGemma...`);
    const regionLabel = bbox.label || `detected_region_${i+1}`;
    
    const raw = await callMedGemma(cropBase64, regionLabel);
    if (raw) {
      const parsed = parseResponse(raw);
      if (parsed) {
        allRaw.push(parsed);
        if (parsed.fracture_detected) overallFracture = true;
        
        let findingLine = `Region ${i+1} (${regionLabel}): ${parsed.findings}`;
        if (parsed.fracture_detected) {
          findingLine += ` [Fracture: ${parsed.fracture_type}]`;
        }
        aggregatedFindings.push(findingLine);
        
        if (parsed.confidence > highestConfidence) {
           highestConfidence = parsed.confidence;
        }
      }
    }
  }

  // Step 5: Aggregate results
  if (allRaw.length > 0) {
    const baseOutput = allRaw[0];
    const firstFracture = allRaw.find(p => p.fracture_detected) || baseOutput;
    
    return {
       ...firstFracture,
       findings: aggregatedFindings.join('\\n'),
       confidence: highestConfidence,
       fracture_detected: overallFracture,
       region_focus: `YOLO Multiple Regions (${bboxes.length})`,
       mock: false,
       source: 'hybrid-pipeline'
    };
  }

  // 3. Fallback — deterministic safe response
  console.log('  📦 Returning fallback response');
  return { ...FALLBACK_RESPONSE, region_focus: defaultRegionLabel, mock: true, source: 'fallback' };
}

// ── Exports ───────────────────────────────────────────────

module.exports = { analyzeRegion };
