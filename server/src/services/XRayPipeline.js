const { spawn } = require('child_process');
const path = require('path');
const { analyzeCrop } = require('./medgemmaClient');
const { synthesizeXRayReasoning } = require('./txgemmaReasoner');

/**
 * Invokes the YOLO python script to detect and crop regions of interest.
 * @param {string} imageBase64 - the raw data URI of the image
 * @returns {Promise<Array>} List of crop objects { id, base64, box, label }
 */
function runYOLOCropper(imageBase64) {
  return new Promise((resolve, reject) => {
    console.log(`  📸 Running YOLO region detection...`);
    const scriptPath = path.join(__dirname, '../ai/yoloCropper.py');
    
    // Spawn python process
    const pythonProcess = spawn('python', [scriptPath, imageBase64], {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for base64 strings
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`  ❌ YOLO Cropper exited with code ${code}: ${errorData}`);
        return reject(new Error(`YOLO processing failed: ${errorData}`));
      }

      try {
        const result = JSON.parse(outputData.trim());
        if (!result.success) {
          return reject(new Error(result.error || 'Unknown YOLO error'));
        }
        console.log(`  ✅ YOLO detected ${result.crops?.length || 0} regions.`);
        resolve(result.crops || []);
      } catch (err) {
        console.error(`  ❌ Failed to parse YOLO output:`, err);
        reject(new Error('Invalid output from YOLO cropper'));
      }
    });

    // Handle process errors (e.g., python not installed)
    pythonProcess.on('error', (err) => {
      console.error(`  ❌ Failed to start YOLO python process:`, err);
      reject(err);
    });
  });
}

/**
 * The main X-Ray Pipeline Coordinator
 * 
 * 1. Accepts full image
 * 2. Runs YOLO to crop (falls back to full image if YOLO fails)
 * 3. Runs MedGemma on each crop in parallel
 * 4. Merges findings and runs TxGemma Reasoning
 * 
 * @param {string} imageBase64 
 * @param {Object} patient 
 * @param {string} voiceQuestion 
 */
async function processXRayMultimodal(imageBase64, patient, voiceQuestion) {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING MULTIMODAL X-RAY PIPELINE`);
  console.log(`======================================================`);
  const startTime = Date.now();

  let regionsToAnalyze = [];

  // --- STEP 1: YOLO Cropping ---
  try {
    const crops = await runYOLOCropper(imageBase64);
    if (crops.length > 0) {
      regionsToAnalyze = crops.map(c => ({
        ...c,
        isCropped: true
      }));
    } else {
      console.log(`  ⚠️ YOLO returned 0 crops, falling back to full image analysis`);
      regionsToAnalyze.push({ id: 'full', base64: imageBase64, label: 'Full Image', isCropped: false });
    }
  } catch (error) {
    console.error(`  ⚠️ YOLO step failed, falling back to full image analysis. Error: ${error.message}`);
    regionsToAnalyze.push({ id: 'full', base64: imageBase64, label: 'Full Image', isCropped: false });
  }

  // --- STEP 2: Parallel MedGemma Analysis ---
  console.log(`  🔍 Analyzing ${regionsToAnalyze.length} regions with MedGemma...`);
  
  // We map the array of regions to an array of promises, and wait for all to complete
  const analysisPromises = regionsToAnalyze.map(region => 
    analyzeCrop(region.base64, {
      label: region.label,
      isCropped: region.isCropped,
      patient: patient,
      question: voiceQuestion
    })
  );

  const medgemmaResults = await Promise.all(analysisPromises);
  const successfulAnalyses = medgemmaResults.filter(r => r.success);
  console.log(`  ✅ ${successfulAnalyses.length}/${medgemmaResults.length} regions successfully analyzed.`);

  // --- STEP 3: TxGemma synthesis ---
  console.log(`  🧬 Synthesizing reasoning with TxGemma...`);
  const finalAssessment = await synthesizeXRayReasoning({
    medgemmaResults,
    patient,
    voiceQuestion
  });

  const totalTime = Date.now() - startTime;
  console.log(`✅ MULTIMODAL PIPELINE COMPLETE in ${totalTime}ms\n`);

  return {
    success: true,
    assessment: finalAssessment,
    regions_analyzed: regionsToAnalyze.length,
    raw_findings: medgemmaResults,
    pipeline_time_ms: totalTime
  };
}

module.exports = { processXRayMultimodal };
