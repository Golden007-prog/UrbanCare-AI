const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Load environment to get JWT_SECRET
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET || 'urbancare_secret_key_change_me_in_prod';

async function testPipeline() {
  console.log('🧪 Testing X-Ray Multimodal Pipeline Endpoint...');

  try {
    // Generate an admin-level JWT for testing 
    const mockToken = jwt.sign(
      { id: 'U010', email: 'admin@demohospital.com', role: 'hospital_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const formData = new FormData();
    
    // We'll create a dummy image if we don't have one handy
    const dummyImagePath = path.join(__dirname, 'dummy.png');
    if (!fs.existsSync(dummyImagePath)) {
      // Create a small 1x1 transparent PNG
      const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(dummyImagePath, pixel);
    }

    formData.append('image', fs.createReadStream(dummyImagePath));
    formData.append('voiceQuestion', "Analyze this X-ray and check for fractures.");
    formData.append('patientContext', JSON.stringify({
      name: "Test Patient",
      age: 45,
      gender: "Male",
      condition: "Fell on outstretched hand",
      vitals: { heartRate: { value: 80 } }
    }));

    console.log('📡 Sending request to http://localhost:5001/api/xray/full-pipeline...');
    
    const response = await axios.post('http://localhost:5001/api/xray/full-pipeline', formData, {
      headers: { 
        ...formData.getHeaders(),
        Cookie: `token=${mockToken}` 
      },
      timeout: 120000 // give it lots of time as YOLO + TxGemma can be slow the first time
    });

    console.log('\n✅ PIPELINE SUCCESS');
    console.log('Response Status:', response.status);
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ PIPELINE FAILED');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testPipeline();
