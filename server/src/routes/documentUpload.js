// ──────────────────────────────────────────────────────────
// Document Upload Route — POST /api/documents/upload
// Uses multer for real file uploads (PDF, XML, JPG, PNG)
// ──────────────────────────────────────────────────────────

const express = require('express');
const path = require('path');
const multer = require('multer');
const documentService = require('../services/documentService');

const router = express.Router();

// ── Multer config ─────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.xml', '.jpg', '.jpeg', '.png'];
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

// ── POST /api/documents/upload ────────────────────────────
// FormData: file, patientID, documentType, title?, notes?

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { patientID, documentType, title, notes } = req.body;

    if (!patientID) {
      return res.status(400).json({ success: false, error: 'Missing required field: patientID' });
    }

    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

    const doc = await documentService.uploadFile({
      patientID,
      hospitalID: req.body.hospitalID || 'H001',
      type: documentType || 'lab_report',
      filePath: req.file.path,
      originalName: req.file.originalname,
      fileType: ext === 'jpeg' ? 'jpg' : ext,
      fileSize: req.file.size,
      uploadedByUserID: req.user?.id || 'current-user',
      uploaderRole: req.user?.role || 'doctor',
      title: title || req.file.originalname,
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/documents/status/:id ─────────────────────────
// Poll processing status of a document

router.get('/status/:id', (req, res) => {
  const doc = documentService.getById(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  res.json({
    success: true,
    data: {
      id: doc.id,
      status: doc.status,
      extractedData: doc.extractedData,
    },
  });
});

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
