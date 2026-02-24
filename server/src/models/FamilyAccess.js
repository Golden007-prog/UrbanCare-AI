// ──────────────────────────────────────────────────────────
// FamilyAccess Model — In-Memory Store
// ──────────────────────────────────────────────────────────

const crypto = require('crypto');

const familyAccessTokens = [];

function generateToken(patientID, familyUserID, hoursValid = 72) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000).toISOString();

  const entry = {
    id: `FA${String(familyAccessTokens.length + 1).padStart(3, '0')}`,
    patientID,
    familyUserID: familyUserID || null,
    permissionLevel: 'read-only',
    token,
    expiresAt,
  };

  familyAccessTokens.push(entry);
  return entry;
}

function findByToken(token) {
  const entry = familyAccessTokens.find((fa) => fa.token === token);
  if (!entry) return null;

  // Check expiry
  if (new Date(entry.expiresAt) < new Date()) {
    return null; // expired
  }
  return entry;
}

function findByPatientID(patientID) {
  return familyAccessTokens.filter(
    (fa) => fa.patientID === patientID && new Date(fa.expiresAt) > new Date()
  );
}

module.exports = { familyAccessTokens, generateToken, findByToken, findByPatientID };
