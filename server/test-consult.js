// Quick test for /api/ai-consult endpoint
const http = require('http');

const data = JSON.stringify({
  message: "What is this patient's current heart rate status?",
  patientContext: {
    patientId: "P001",
    name: "John Doe",
    age: 45,
    gender: "Male",
    condition: "Hypertension",
    riskLevel: "Stable",
    vitals: {
      heartRate: 82,
      spo2: 96,
      temperature: 98.8,
      respiration: 18,
      bloodPressure: "138/88 mmHg"
    },
    activeAlerts: "",
    notesSummary: ""
  },
  language: "en"
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/ai-consult',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('Success:', json.success);
      if (json.data) {
        console.log('Model:', json.data.model);
        console.log('Content (first 300 chars):', json.data.content?.substring(0, 300));
      }
      if (json.error) console.log('Error:', json.error);
    } catch(e) {
      console.log('Raw:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Request failed:', e.message));
req.write(data);
req.end();
