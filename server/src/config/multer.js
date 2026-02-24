// ──────────────────────────────────────────────────────────
// Multer Configuration — Memory Storage for GCS Pipeline
// ──────────────────────────────────────────────────────────

const multer = require('multer');

// Use memory storage so the file buffer is available for
// direct upload to Google Cloud Storage (no temp files on disk).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (_req, file, cb) => {
    // Allow common medical report formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/dicom',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

module.exports = upload;
