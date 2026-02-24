// ──────────────────────────────────────────────────────────
// Patient Upload Routes — /api/patient/upload
// Uses existing multer config for file uploads
// Sends to TxGemma for AI analysis after upload
// Pattern: AlloyDB first → in-memory fallback
// ──────────────────────────────────────────────────────────

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/db');
const { analyzePatientReport } = require('../services/txgemmaClient');

const router = express.Router();

// ── In-memory fallback store ──────────────────────────────
const memoryDocs = [];

// ── Multer config (reuses same upload dir) ────────────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `patient-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Accepted: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// All upload routes require auth
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// POST /api/patient/upload — Upload a document
// FormData: file, type (doctor_report|pharmacy_bill|lab_report)
// Optional: patient_profile_id (for lab/pharmacy uploads)
// ──────────────────────────────────────────────────────────

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { type, patient_profile_id } = req.body;
    const userId = req.user.id;
    const uploaderRole = req.user.role;
    const docId = `PD-${crypto.randomUUID().slice(0, 8)}`;
    const fileURL = `/uploads/${path.basename(req.file.path)}`;

    // Find patient profile ID
    let profileId = patient_profile_id || null;
    if (!profileId) {
      // If patient is uploading for themselves, find their profile
      try {
        const profileResult = await query(
          'SELECT id FROM patient_profiles WHERE user_id = $1',
          [userId]
        );
        if (profileResult.rows.length > 0) {
          profileId = profileResult.rows[0].id;
        }
      } catch (dbErr) {
        // Memory fallback — this comes from patientIntake.js
        console.warn('⚠️  Profile lookup failed:', dbErr.message);
      }
    }

    // Create document record
    let doc;
    try {
      const insertSQL = `
        INSERT INTO patient_documents (id, patient_profile_id, type, file_url, original_name, uploaded_by, uploader_role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
        RETURNING *
      `;
      const values = [
        docId,
        profileId,
        type || 'doctor_report',
        fileURL,
        req.file.originalname,
        userId,
        uploaderRole,
      ];
      const result = await query(insertSQL, values);
      doc = result.rows[0];
      console.log(`✅  Patient document created in AlloyDB: ${docId}`);
    } catch (dbErr) {
      // Fallback to in-memory
      console.warn('⚠️  AlloyDB insert failed, using memory fallback:', dbErr.message);
      doc = {
        id: docId,
        patient_profile_id: profileId,
        type: type || 'doctor_report',
        file_url: fileURL,
        original_name: req.file.originalname,
        uploaded_by: userId,
        uploader_role: uploaderRole,
        status: 'processing',
        extracted_text: null,
        ai_summary: null,
        created_at: new Date().toISOString(),
      };
      memoryDocs.push(doc);
    }

    // Return immediately — AI pipeline runs async
    res.status(201).json({ success: true, data: doc });

    // ── Async AI Pipeline ─────────────────────────────────
    runPatientAIPipeline(doc, req.file.path, profileId).catch((err) => {
      console.error(`❌ Patient AI pipeline failed for ${docId}:`, err.message);
      updateDocStatus(docId, 'error', null, err.message);
    });
  } catch (err) {
    console.error('❌  Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/upload/status/:id — Poll document status
// ──────────────────────────────────────────────────────────

router.get('/status/:id', async (req, res) => {
  try {
    let doc = null;
    try {
      const result = await query(
        'SELECT id, status, ai_summary, original_name, type FROM patient_documents WHERE id = $1',
        [req.params.id]
      );
      if (result.rows.length > 0) doc = result.rows[0];
    } catch (dbErr) {
      doc = memoryDocs.find((d) => d.id === req.params.id) || null;
    }

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ── AI Pipeline (async) ───────────────────────────────────

async function runPatientAIPipeline(doc, filePath, profileId) {
  console.log(`🧠 Patient AI Pipeline started for ${doc.id} (${doc.original_name})`);

  try {
    // Extract text from file (basic approach for PDFs)
    let extractedText = '';
    const ext = path.extname(doc.original_name || '').toLowerCase();

    if (ext === '.pdf') {
      // Use filename heuristics + basic text for now
      // Full PDF text extraction would need pdf-parse
      extractedText = `Document: ${doc.original_name}. Type: ${doc.type}. Uploaded for patient profile ${profileId}.`;

      // Try pdf-parse if available
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || extractedText;
      } catch (_) {
        // pdf-parse not installed, use filename-based analysis
        console.log('  ℹ️  pdf-parse not available, using filename-based analysis');
      }
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      extractedText = `Medical image: ${doc.original_name}. Type: ${doc.type}.`;
    }

    // Get patient context for AI
    let patientContext = {};
    try {
      const result = await query(
        'SELECT age, gender, condition FROM patient_profiles WHERE id = $1',
        [profileId]
      );
      if (result.rows.length > 0) patientContext = result.rows[0];
    } catch (_) {}

    // Send to TxGemma for analysis
    const aiResult = await analyzePatientReport(extractedText, patientContext);

    // Update document with results
    await updateDocStatus(doc.id, 'complete', aiResult, null, extractedText);
    console.log(`✅ Patient AI Pipeline complete for ${doc.id}`);
  } catch (err) {
    console.error(`❌ Patient AI Pipeline error for ${doc.id}:`, err.message);
    await updateDocStatus(doc.id, 'error', null, err.message);
  }
}

async function updateDocStatus(docId, status, aiSummary, error, extractedText) {
  try {
    await query(
      `UPDATE patient_documents SET status = $1, ai_summary = $2, extracted_text = $3 WHERE id = $4`,
      [status, aiSummary ? JSON.stringify(aiSummary) : null, extractedText || error || null, docId]
    );
  } catch (dbErr) {
    // Update in-memory fallback
    const memDoc = memoryDocs.find((d) => d.id === docId);
    if (memDoc) {
      memDoc.status = status;
      memDoc.ai_summary = aiSummary;
      memDoc.extracted_text = extractedText || error || null;
    }
  }
}

// ── Error handler for multer ──────────────────────────────

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'File too large. Maximum size is 20 MB.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
