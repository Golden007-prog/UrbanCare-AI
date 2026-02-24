// ──────────────────────────────────────────────────────────
// Upload Report Route — POST /api/upload-report
// ──────────────────────────────────────────────────────────

const express = require('express');
const upload = require('../config/multer');
const { uploadToGCS } = require('../config/storage');
const { query } = require('../config/db');

const router = express.Router();

/**
 * POST /api/upload-report
 *
 * Accepts a single file upload (field name: "file"),
 * uploads it to Google Cloud Storage, then inserts a
 * metadata record into the `reports` table.
 *
 * Optional body fields:
 *   - patient_id  (string)  — linked patient
 *   - title       (string)  — report title
 *   - notes       (string)  — additional notes
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // ── Validate file ───────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Please upload a file with field name "file".',
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const { patient_id, title, notes } = req.body;

    // ── Upload to GCS ───────────────────────────────────────
    const fileUrl = await uploadToGCS(buffer, originalname, mimetype);

    // ── Insert metadata into reports table ───────────────────
    const result = await query(
      `INSERT INTO reports (patient_id, title, original_filename, mime_type, file_size_bytes, file_url, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        patient_id || null,
        title || originalname,
        originalname,
        mimetype,
        size,
        fileUrl,
        notes || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Report uploaded successfully.',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('❌  Upload report error:', err.message);

    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10 MB.',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload report.',
    });
  }
});

module.exports = router;
