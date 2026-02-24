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
        const classification = await ReportPageClassifier.process(
          { imageBase64 },
          { modelId: 'google/medgemma-4b-it' }
        );
        extractedData.category = classification.category;
        extractedData.classificationConfidence = classification.confidence;
      }

      if (TabularLabExtractor && extractedData.category === 'lab_report') {
        const labData = await TabularLabExtractor.process(
          { imageBase64 },
          { modelId: 'google/medgemma-4b-it' }
        );
        extractedData.labs = labData.labs;
        extractedData.labCount = labData.count;
      }
    } else if (ext === 'pdf') {
      // ── PDF: Use text-based classification + mock extraction ──
      // (Full PDF parsing would require pdf-parse; for now use filename heuristics)
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
        const classification = await ReportPageClassifier.process(
          { text: nameHint },
          { modelId: 'google/medgemma-4b-it' }
        );
        extractedData.category = classification.category;
        extractedData.classificationConfidence = classification.confidence;
      }
    }

    // Generate summary if agent is available
    if (DetailedReportSummary && extractedData.labs) {
      try {
        const summary = await DetailedReportSummary.process(
          { text: JSON.stringify(extractedData.labs) },
          { modelId: 'google/medgemma-4b-it' }
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
