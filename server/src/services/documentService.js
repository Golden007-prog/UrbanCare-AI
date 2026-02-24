// ──────────────────────────────────────────────────────────
// Document Service — Business Logic Layer (File Upload + AI Pipeline)
// ──────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const DocumentModel = require('../models/Document');
const AlertModel = require('../models/Alert');
const PatientModel = require('../models/Patient');

// ── Lazy-load agents to avoid circular deps ───────────────
let ReportPageClassifier, TabularLabExtractor, DetailedReportSummary;

function loadAgents() {
  if (!ReportPageClassifier) {
    try {
      ReportPageClassifier = new (require('../agents/classification/ReportPageClassifier'))();
      TabularLabExtractor = new (require('../agents/extraction/TabularLabExtractor'))();
      DetailedReportSummary = new (require('../agents/extraction/DetailedReportSummary'))();
    } catch (err) {
      console.warn('⚠️  Could not load AI agents:', err.message);
    }
  }
}

// ── Basic CRUD ────────────────────────────────────────────

function list(patientID) {
  return DocumentModel.getByPatientID(patientID);
}

function listByHospital(patientID, hospitalID) {
  return DocumentModel.getByPatientAndHospital(patientID, hospitalID);
}

function getById(id) {
  return DocumentModel.getById(id);
}

function upload(data) {
  const doc = DocumentModel.create(data);

  // Auto-notify doctor when lab or pharmacy uploads
  const patient = PatientModel.findById(data.patientID);
  const patientName = patient ? patient.name : data.patientID;

  if (data.uploaderRole === 'lab') {
    AlertModel.create({
      patientID: data.patientID,
      type: 'info',
      message: `New lab report available for ${patientName}: "${doc.title || doc.type}"`,
    });
  } else if (data.uploaderRole === 'pharmacist') {
    AlertModel.create({
      patientID: data.patientID,
      type: 'info',
      message: `Medication purchase uploaded for ${patientName}: "${doc.title || doc.type}"`,
    });
  }

  return doc;
}

// ── File Upload with AI Pipeline ──────────────────────────

async function uploadFile({
  patientID,
  hospitalID,
  type,
  filePath,
  originalName,
  fileType,
  fileSize,
  uploadedByUserID,
  uploaderRole,
  title,
  notes,
}) {
  // 1. Create document record with status = processing
  const doc = DocumentModel.create({
    patientID,
    hospitalID: hospitalID || 'H001',
    type: type || 'lab_report',
    fileURL: `/uploads/${path.basename(filePath)}`,
    filePath,
    originalName,
    fileType,
    fileSize,
    uploadedByUserID: uploadedByUserID || 'current-user',
    uploaderRole: uploaderRole || 'doctor',
    title: title || originalName,
    notes: notes || '',
    status: 'processing',
  });

  // 2. Kick off async AI pipeline (don't block the HTTP response)
  runAIPipeline(doc).catch((err) => {
    console.error(`❌ AI pipeline failed for doc ${doc.id}:`, err.message);
    DocumentModel.updateStatus(doc.id, 'error', { error: err.message });
  });

  return doc;
}

// ── AI Pipeline ───────────────────────────────────────────

async function runAIPipeline(doc) {
  loadAgents();
  const ext = (doc.fileType || '').toLowerCase();
  let extractedData = {};

  // Helper: run an agent call with a hard timeout so we never hang
  const AGENT_TIMEOUT = 120000; // 120 seconds per agent call (lab extraction can take 90s+ for large images)
  function withTimeout(promise, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${AGENT_TIMEOUT / 1000}s`)), AGENT_TIMEOUT)
      ),
    ]);
  }

  console.log(`🧠 AI Pipeline started for ${doc.id} (${doc.originalName}, type=${ext})`);

  try {
    if (ext === 'xml') {
      // ── XML: Direct parse ──
      const xmlContent = fs.readFileSync(doc.filePath, 'utf-8');
      extractedData = parseXMLLabData(xmlContent);
      extractedData.category = 'lab_report';
    } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
      // ── Image: Classify then extract ──
      const imageBase64 = fs.readFileSync(doc.filePath, 'base64');

      if (ReportPageClassifier) {
        try {
          const classification = await withTimeout(
            ReportPageClassifier.process({ imageBase64 }, {}),
            'ReportPageClassifier'
          );
          extractedData.category = classification.category === 'unknown' ? doc.type : classification.category;
          extractedData.classificationConfidence = classification.confidence;
        } catch (err) {
          console.warn(`⚠️  Classification failed (using doc type): ${err.message}`);
          extractedData.category = doc.type || 'lab_report';
        }
      }

      // If category is still not lab_report but the document was explicitly uploaded as one, force it
      const categoryToUse = (extractedData.category === 'lab_report' || doc.type === 'lab_report') ? 'lab_report' : extractedData.category;
      extractedData.category = categoryToUse;

      if (TabularLabExtractor && categoryToUse === 'lab_report') {
        try {
          const labData = await withTimeout(
            TabularLabExtractor.process({ imageBase64 }, {}),
            'TabularLabExtractor'
          );
          extractedData.labs = labData.labs;
          extractedData.labCount = labData.count;
        } catch (err) {
          console.warn(`⚠️  Lab extraction failed (using mock): ${err.message}`);
        }
      }
    } else if (ext === 'pdf') {
      // ── PDF: Use text-based classification + mock extraction ──
      const nameHint = (doc.originalName || '').toLowerCase();
      if (/lab|blood|cbc|metabolic|lipid|thyroid/i.test(nameHint)) {
        extractedData.category = 'lab_report';
      } else if (/xray|x-ray|ct|mri|radiol/i.test(nameHint)) {
        extractedData.category = 'radiology_report';
      } else if (/bill|invoice|pharmacy|receipt/i.test(nameHint)) {
        extractedData.category = 'bill';
      } else if (/prescription|rx/i.test(nameHint)) {
        extractedData.category = 'prescription';
      } else {
        extractedData.category = 'lab_report'; // default
      }

      if (ReportPageClassifier) {
        try {
          const classification = await withTimeout(
            ReportPageClassifier.process({ text: nameHint }, {}),
            'ReportPageClassifier (PDF)'
          );
          extractedData.category = classification.category;
          extractedData.classificationConfidence = classification.confidence;
        } catch (err) {
          console.warn(`⚠️  PDF classification failed: ${err.message}`);
        }
      }
    }

    // Generate summary if agent is available and we have lab data
    if (DetailedReportSummary && extractedData.labs) {
      try {
        const summary = await withTimeout(
          DetailedReportSummary.process(
            { 'tabular-lab-extractor': { labs: extractedData.labs } },
            {}
          ),
          'DetailedReportSummary'
        );
        extractedData.summary = summary.summary || summary;
      } catch (err) {
        console.warn('⚠️  Summary generation failed:', err.message);
      }
    }

    DocumentModel.updateStatus(doc.id, 'complete', extractedData);
    console.log(`✅ AI Pipeline complete for ${doc.id}: category=${extractedData.category}`);
  } catch (err) {
    console.error(`❌ AI Pipeline error for ${doc.id}:`, err.message);
    DocumentModel.updateStatus(doc.id, 'error', { error: err.message });
  }
}

// ── XML Lab Data Parser ───────────────────────────────────

function parseXMLLabData(xmlString) {
  // Simple regex-based XML parser for common lab export formats
  const labs = [];
  const testRegex = /<test[^>]*>([\s\S]*?)<\/test>/gi;
  let match;

  while ((match = testRegex.exec(xmlString)) !== null) {
    const block = match[1];
    const name = (block.match(/<name>(.*?)<\/name>/i) || [])[1] || '';
    const value = (block.match(/<value>(.*?)<\/value>/i) || [])[1] || '';
    const unit = (block.match(/<unit>(.*?)<\/unit>/i) || [])[1] || '';
    const range = (block.match(/<(?:reference|range|referenceRange)>(.*?)<\/(?:reference|range|referenceRange)>/i) || [])[1] || '';

    if (name) {
      labs.push({ test: name, value, unit, referenceRange: range, status: 'normal' });
    }
  }

  // Fallback: if no <test> tags found, try extracting any key-value pairs
  if (labs.length === 0) {
    const kvRegex = /<(\w+)>([\d.]+)\s*(\w*)<\/\1>/g;
    while ((match = kvRegex.exec(xmlString)) !== null) {
      labs.push({ test: match[1], value: match[2], unit: match[3] || '', referenceRange: '', status: 'normal' });
    }
  }

  return { labs, count: labs.length };
}

module.exports = { list, listByHospital, getById, upload, uploadFile };
