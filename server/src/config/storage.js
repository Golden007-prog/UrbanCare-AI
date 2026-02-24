// ──────────────────────────────────────────────────────────
// Google Cloud Storage — Upload Utility
// ──────────────────────────────────────────────────────────

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');

// Initialize GCS client.
// In production on GCE/Cloud Run, default compute credentials are used automatically.
// Locally, set GOOGLE_APPLICATION_CREDENTIALS env var to a service-account key file.
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID || undefined,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'urbancare-reports';
const bucket = storage.bucket(bucketName);

/**
 * Upload a file buffer to Google Cloud Storage.
 *
 * @param {Buffer}  fileBuffer   - The file contents (from Multer memoryStorage)
 * @param {string}  originalName - Original filename (e.g. "report.pdf")
 * @param {string}  mimetype     - MIME type (e.g. "application/pdf")
 * @returns {Promise<string>}    - The public URL of the uploaded file
 */
async function uploadToGCS(fileBuffer, originalName, mimetype) {
  // Generate a unique filename to prevent collisions
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const destFileName = `reports/${baseName}-${uniqueSuffix}${ext}`;

  const file = bucket.file(destFileName);

  // Upload the buffer as a stream
  await file.save(fileBuffer, {
    metadata: {
      contentType: mimetype,
    },
    resumable: false, // small files — no need for resumable upload
  });

  // Make the file publicly readable
  await file.makePublic();

  // Return the public URL
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${destFileName}`;
  console.log(`☁️   Uploaded to GCS: ${publicUrl}`);

  return publicUrl;
}

module.exports = { storage, bucket, uploadToGCS };
