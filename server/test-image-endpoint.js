// Test all 3 image analysis endpoints with cookie-based auth
const http = require('http');

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {};
    let data = '';
    if (body) {
      data = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(
      { hostname: 'localhost', port: 5001, path, method, headers },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: chunks })
        );
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function main() {
  console.log('🚀 UrbanCare Image Endpoint Tests');
  console.log('══════════════════════════════════\n');

  // 1. Login
  console.log('1️⃣  Logging in as dr.smith@urbancare.com...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'dr.smith@urbancare.com',
    password: 'password123',
  });
  console.log(`   Status: ${loginRes.status}`);
  const setCookie = loginRes.headers['set-cookie'];
  const tokenCookie = setCookie ? setCookie.find(c => c.startsWith('token=')) : null;
  const cookie = tokenCookie ? tokenCookie.split(';')[0] : '';
  console.log(`   Cookie: ${cookie ? 'OBTAINED ✅' : 'MISSING ❌'}\n`);

  if (!cookie) {
    console.error('Cannot proceed without auth cookie.');
    process.exit(1);
  }

  // 2. Test /api/analyze-image (legacy)
  console.log('2️⃣  POST /api/analyze-image (legacy endpoint)');
  console.log('─'.repeat(50));
  const r1 = await request('POST', '/api/analyze-image', {
    imageBase64: TINY_PNG,
    imageType: 'chest-xray',
    patientContext: {
      symptoms: 'cough and fever',
      age: 45,
      gender: 'male',
      condition: 'suspected pneumonia',
      vitals: { heartRate: 102, spO2: 93, temperature: 101.2, respiration: 22 }
    }
  }, cookie);
  console.log(`   Status: ${r1.status}`);
  console.log(`   Response:\n${JSON.stringify(JSON.parse(r1.body), null, 2)}\n`);

  // 3. Test /api/image-analyze (region-based)
  console.log('3️⃣  POST /api/image-analyze (region-based endpoint)');
  console.log('─'.repeat(50));
  const r2 = await request('POST', '/api/image-analyze', {
    imageBase64: TINY_PNG,
    question: 'Is there a fracture visible in the hand?',
    selectedRegionCoordinates: { x: 0.3, y: 0.4, width: 0.3, height: 0.3 },
    patientContext: {
      symptoms: 'pain in middle finger after fall',
      age: 30,
      gender: 'female'
    }
  }, cookie);
  console.log(`   Status: ${r2.status}`);
  console.log(`   Response:\n${JSON.stringify(JSON.parse(r2.body), null, 2)}\n`);

  // 4. Test /api/xray-fracture-analyze (structured fracture detection)
  console.log('4️⃣  POST /api/xray-fracture-analyze (fracture detection)');
  console.log('─'.repeat(50));
  const r3 = await request('POST', '/api/xray-fracture-analyze', {
    imageBase64: TINY_PNG,
    region_focus: 'middle_finger',
    image_type: 'hand_xray',
    is_cropped: false,
    question: 'Check for fracture in middle finger',
    patient_context: {
      age: 30,
      gender: 'female',
      condition: 'trauma to right hand'
    }
  }, cookie);
  console.log(`   Status: ${r3.status}`);
  console.log(`   Response:\n${JSON.stringify(JSON.parse(r3.body), null, 2)}\n`);

  console.log('✅ All 3 image endpoint tests complete!\n');
}

main().catch(console.error);
