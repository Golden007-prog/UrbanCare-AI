// ──────────────────────────────────────────────────────────
// Hospital Settings Model — In-Memory Store
// ──────────────────────────────────────────────────────────

// hospital_id -> settings object
const settings = {
  'H001': {
    hospital_id: 'H001',
    hf_token_encrypted: null,
    gemini_api_key_encrypted: null,
    offline_mode_enabled: false,
    edge_model_enabled: false,
    max_patients: 5000,
    model_preference: 'medgemma-4b-it',
  },
  'H002': {
    hospital_id: 'H002',
    hf_token_encrypted: null,
    gemini_api_key_encrypted: null,
    offline_mode_enabled: true, // Example: forcing offline
    edge_model_enabled: true,
    max_patients: 1000,
    model_preference: 'txgemma-2b',
  },
  'H003': {
    hospital_id: 'H003',
    hf_token_encrypted: null,
    gemini_api_key_encrypted: null,
    offline_mode_enabled: false,
    edge_model_enabled: false,
    max_patients: 500,
    model_preference: 'txgemma-9b',
  },
  'H999': {
    hospital_id: 'H999',
    hf_token_encrypted: null,
    gemini_api_key_encrypted: null,
    offline_mode_enabled: false,
    edge_model_enabled: true,
    max_patients: 100,
    model_preference: 'medgemma-4b-it',
  }
};

function getSettings(hospitalId) {
  if (!settings[hospitalId]) {
    // Return defaults if none explicitly set
    return {
      hospital_id: hospitalId,
      hf_token_encrypted: null,
      gemini_api_key_encrypted: null,
      offline_mode_enabled: false,
      edge_model_enabled: false,
      max_patients: 1000,
      model_preference: 'txgemma-9b',
    };
  }
  return settings[hospitalId];
}

function updateSettings(hospitalId, updates) {
  if (!settings[hospitalId]) {
    settings[hospitalId] = getSettings(hospitalId);
  }
  settings[hospitalId] = {
    ...settings[hospitalId],
    ...updates,
  };
  return settings[hospitalId];
}

module.exports = {
  getSettings,
  updateSettings,
};
