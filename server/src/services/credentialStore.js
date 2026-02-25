// ──────────────────────────────────────────────────────────
// Credential Store — In-memory per-user API key storage
// ──────────────────────────────────────────────────────────
//
// Stores HuggingFace and Gemini API keys per authenticated
// user. Keys are held only in server memory (never written
// to disk) and expire after 24 hours or on logout.
//
// Usage:
//   const store = require('./credentialStore');
//   store.set(userId, hfToken, geminiKey);
//   const creds = store.get(userId);
//   store.clear(userId);

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Map<userId, { hfToken, geminiKey, setAt }>
const credentials = new Map();

/**
 * Store credentials for a user.
 * @param {string} userId
 * @param {string} hfToken  — HuggingFace access token
 * @param {string} geminiKey — Google Gemini API key
 */
function set(userId, hfToken, geminiKey) {
  credentials.set(userId, {
    hfToken,
    geminiKey,
    setAt: Date.now(),
  });
}

/**
 * Retrieve credentials for a user.
 * Returns null if not set or expired.
 * @param {string} userId
 * @returns {{ hfToken: string, geminiKey: string } | null}
 */
function get(userId) {
  const entry = credentials.get(userId);
  if (!entry) return null;

  // Auto-expire after MAX_AGE_MS
  if (Date.now() - entry.setAt > MAX_AGE_MS) {
    credentials.delete(userId);
    return null;
  }

  return { hfToken: entry.hfToken, geminiKey: entry.geminiKey };
}

/**
 * Check if a user has stored credentials (without returning them).
 * @param {string} userId
 * @returns {boolean}
 */
function has(userId) {
  return get(userId) !== null;
}

/**
 * Clear credentials for a user (on logout).
 * @param {string} userId
 */
function clear(userId) {
  credentials.delete(userId);
}

/**
 * Cleanup expired entries (called periodically).
 */
function cleanup() {
  const now = Date.now();
  for (const [userId, entry] of credentials) {
    if (now - entry.setAt > MAX_AGE_MS) {
      credentials.delete(userId);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanup, 30 * 60 * 1000);

module.exports = { set, get, has, clear, cleanup };
