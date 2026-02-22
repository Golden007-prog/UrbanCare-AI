// ──────────────────────────────────────────────────────────
// Offline Mode Middleware
// ──────────────────────────────────────────────────────────
//
// Checks for the `x-offline-mode` header or `offlineMode`
// body flag. When offline mode is active:
//
//   1. Sets req.offlineMode = true
//   2. Overrides req.body.model to the offline variant
//   3. Logs to console for observability
//
// Model routing:
//   Online                        → Offline
//   google/medgemma-4b-it          → google/medgemma-4b-it    (same — runs locally)
//   google/txgemma-9b-predict      → google/txgemma-2b-predict (smaller, faster)
//
// When real models are integrated, this middleware will
// handle the actual routing to local vs cloud inference.
// ──────────────────────────────────────────────────────────

const OFFLINE_MODEL_MAP = {
  // Image models — MedGemma 4B is already the local model
  medgemma: 'medgemma',

  // Text models — downgrade to 2B for offline
  txgemma: 'txgemma-offline',

  // Speech models — same model works locally
  medasr: 'medasr',
};

const OFFLINE_MODEL_REGISTRY = {
  'medgemma': {
    id: 'google/medgemma-4b-it',
    task: 'image-text-to-text',
    description: 'Multimodal medical image analysis (local/offline)',
    offline: true,
  },
  'txgemma-offline': {
    id: 'google/txgemma-2b-predict',
    task: 'text-generation',
    description: 'Clinical text generation — lightweight offline model',
    offline: true,
  },
  'medasr': {
    id: 'google/medasr',
    task: 'automatic-speech-recognition',
    description: 'Medical speech recognition (local/offline)',
    offline: true,
  },
};

/**
 * Express middleware that detects offline mode and adjusts model routing.
 */
function offlineMiddleware(req, _res, next) {
  // Check header first, then body flag
  const headerFlag = req.headers['x-offline-mode'];
  const bodyFlag = req.body?.offlineMode;

  const isOffline = headerFlag === 'true' || headerFlag === '1' || bodyFlag === true;

  req.offlineMode = isOffline;

  if (isOffline) {
    console.log(`  📴 OFFLINE MODE — ${req.method} ${req.originalUrl}`);
    console.log(`     Running in offline mode — routing to smaller local models`);

    // Auto-remap model if one was specified (or default)
    const currentModel = req.body?.model || 'default';
    const offlineModel = OFFLINE_MODEL_MAP[currentModel] || OFFLINE_MODEL_MAP['txgemma'];

    if (offlineModel && offlineModel !== currentModel) {
      console.log(`     Model override: ${currentModel} → ${offlineModel}`);
      req.body = req.body || {};
      req.body._originalModel = currentModel;
      req.body._offlineModel = offlineModel;
    }
  }

  next();
}

module.exports = {
  offlineMiddleware,
  OFFLINE_MODEL_MAP,
  OFFLINE_MODEL_REGISTRY,
};
