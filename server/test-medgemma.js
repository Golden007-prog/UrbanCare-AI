#!/usr/bin/env node
// ──────────────────────────────────────────────────────────
// Test script: Direct MedGemma Dedicated Endpoint Test
// ──────────────────────────────────────────────────────────
// Tests the dedicated HuggingFace endpoint directly,
// bypassing Express auth to verify the model works.
//
// Usage:  node test-medgemma.js
// ──────────────────────────────────────────────────────────

require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;
const MEDGEMMA_ENDPOINT = process.env.MEDGEMMA_ENDPOINT;

console.log('\n═══════════════════════════════════════════');
console.log('  MedGemma Dedicated Endpoint Test');
console.log('═══════════════════════════════════════════\n');

// ── Validate config ────────────────────────────────────────

if (!HF_TOKEN || !HF_TOKEN.startsWith('hf_')) {
  console.error('❌ HF_TOKEN not set or invalid in .env');
  console.error('   Expected: hf_xxxxx');
  console.error('   Got:', HF_TOKEN || '(empty)');
  process.exit(1);
}
console.log('✅ HF_TOKEN:', HF_TOKEN.slice(0, 8) + '...' + HF_TOKEN.slice(-4));

if (!MEDGEMMA_ENDPOINT) {
  console.error('❌ MEDGEMMA_ENDPOINT not set in .env');
  process.exit(1);
}
console.log('✅ MEDGEMMA_ENDPOINT:', MEDGEMMA_ENDPOINT);

// ── Create a tiny test image (1x1 white pixel PNG as base64) ──

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testEndpoint() {
  console.log('\n── Test 1: Health Check (GET) ──────────────\n');

  try {
    const healthRes = await fetch(MEDGEMMA_ENDPOINT, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
    });
    console.log('  Status:', healthRes.status, healthRes.statusText);
    const healthBody = await healthRes.text();
    console.log('  Response:', healthBody.slice(0, 300));
  } catch (err) {
    console.log('  ⚠️ GET failed (may be expected):', err.message);
  }

  console.log('\n── Test 2: Inference (POST with image) ─────\n');

  const prompt = 'Describe what you see in this medical image briefly.';

  const payload = {
    inputs: `User: ${prompt}\nAssistant:`,
    image: TINY_PNG_B64,
    parameters: {
      max_new_tokens: 100,
      temperature: 0.2,
      top_p: 0.9,
    },
  };

  console.log('  Sending POST to:', MEDGEMMA_ENDPOINT);
  console.log('  Payload keys:', Object.keys(payload));
  console.log('  Prompt:', prompt);
  console.log('  Image size:', TINY_PNG_B64.length, 'chars (1x1 test pixel)\n');

  try {
    const startTime = Date.now();

    const response = await fetch(MEDGEMMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  Status: ${response.status} ${response.statusText} (${elapsed}s)`);

    const body = await response.text();
    console.log('  Raw response:', body.slice(0, 500));

    if (response.ok) {
      try {
        const parsed = JSON.parse(body);
        console.log('\n  ✅ SUCCESS — Model responded!');
        console.log('  Parsed:', JSON.stringify(parsed, null, 2).slice(0, 500));
      } catch {
        console.log('\n  ✅ Got response (non-JSON):', body.slice(0, 300));
      }
    } else {
      console.log('\n  ❌ FAILED — Status', response.status);
      if (response.status === 401 || response.status === 403) {
        console.log('  → Token may be invalid or expired. Check your HF_TOKEN.');
      } else if (response.status === 503) {
        console.log('  → Model is loading. Try again in a few minutes.');
      } else if (response.status === 404) {
        console.log('  → Endpoint not found. Check your MEDGEMMA_ENDPOINT URL.');
      } else if (response.status === 422) {
        console.log('  → Invalid payload format. The endpoint may expect a different schema.');
        console.log('  → Trying alternative payload format...');
        await testAlternativePayload(prompt);
      }
    }
  } catch (err) {
    console.log('  ❌ Network error:', err.message);
    console.log('  → Is the endpoint URL correct? Is your network connected?');
  }
}

// Try alternative payload formats if the first one fails
async function testAlternativePayload(prompt) {
  // Some HF dedicated endpoints use the messages format
  const alternatives = [
    {
      name: 'OpenAI-compatible chat',
      payload: {
        model: 'google/medgemma-4b-it',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${TINY_PNG_B64}` } },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0.2,
      },
      path: '/v1/chat/completions',
    },
    {
      name: 'Direct inputs format',
      payload: {
        inputs: prompt,
        image: TINY_PNG_B64,
        parameters: { max_new_tokens: 100, temperature: 0.2 },
      },
      path: '',
    },
    {
      name: 'Text Generation Inference (TGI) format',
      payload: {
        inputs: `<image>\n${prompt}`,
        parameters: { max_new_tokens: 100, temperature: 0.2 },
      },
      path: '',
    },
  ];

  for (const alt of alternatives) {
    const url = MEDGEMMA_ENDPOINT + alt.path;
    console.log(`\n  → Trying "${alt.name}" at ${url}...`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alt.payload),
      });
      const body = await res.text();
      console.log(`    Status: ${res.status}`);
      console.log(`    Response: ${body.slice(0, 300)}`);
      if (res.ok) {
        console.log(`\n  ✅ "${alt.name}" format WORKS!`);
        console.log('  → Update huggingfaceClient.js to use this payload format.');
        return;
      }
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
  }
  console.log('\n  ❌ None of the alternative formats worked.');
}

testEndpoint().then(() => {
  console.log('\n═══════════════════════════════════════════');
  console.log('  Test complete');
  console.log('═══════════════════════════════════════════\n');
});
