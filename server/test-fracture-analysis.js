#!/usr/bin/env node
// ──────────────────────────────────────────────────────────
// Test script: Fracture Analysis Endpoint
// ──────────────────────────────────────────────────────────
// Tests POST /api/xray-fracture-analyze directly.
//
// Usage:  node test-fracture-analysis.js
// ──────────────────────────────────────────────────────────

const http = require('http');

// 1x1 white pixel PNG as base64 (placeholder)
const TINY_PNG_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const payload = JSON.stringify({
  imageBase64: TINY_PNG_B64,
  region_focus: 'middle_finger',
  image_type: 'hand_xray',
  is_cropped: false,
  patient_context: {
    age: 34,
    gender: 'Male',
    condition: 'Suspected middle finger fracture after fall',
  },
  question: 'Is the middle finger broken?',
});

const REQUIRED_FIELDS = [
  'image_type', 'region_focus', 'findings', 'fracture_detected',
  'fracture_type', 'fracture_location', 'displacement',
  'joint_involvement', 'confidence', 'clinical_recommendation',
];

console.log('\n═══════════════════════════════════════════');
console.log('  Fracture Analysis Endpoint Test');
console.log('═══════════════════════════════════════════\n');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/xray-fracture-analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('  Status:', res.statusCode, res.statusMessage);

    try {
      const json = JSON.parse(body);
      console.log('  Success:', json.success);

      if (json.success && json.data) {
        console.log('\n  ── Response Data ──\n');

        // Validate all required fields
        let missingFields = [];
        for (const field of REQUIRED_FIELDS) {
          const val = json.data[field];
          const present = val !== undefined && val !== null;
          const icon = present ? '✅' : '❌';
          console.log(`  ${icon} ${field}: ${present ? JSON.stringify(val) : 'MISSING'}`);
          if (!present) missingFields.push(field);
        }

        console.log(`\n  Mock mode: ${json.data.mock ? 'Yes (endpoint unavailable)' : 'No (live inference)'}`);
        console.log(`  Model: ${json.data.model || 'not reported'}`);

        if (missingFields.length === 0) {
          console.log('\n  ✅ ALL FIELDS PRESENT — Schema valid!');
        } else {
          console.log(`\n  ⚠️ Missing ${missingFields.length} field(s): ${missingFields.join(', ')}`);
        }
      } else if (json.error) {
        console.log('  ❌ Error:', json.error);
        if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('  → Auth required. Try running with a valid auth token.');
        }
      }
    } catch (e) {
      console.log('  Raw response:', body.slice(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('  ❌ Request failed:', e.message);
  console.error('  → Is the backend server running on port 5001?');
});

req.write(payload);
req.end();

console.log('  Sending POST to http://localhost:5001/api/xray-fracture-analyze ...\n');
