// ──────────────────────────────────────────────────────────
// Vitals Model — In-Memory Store
// ──────────────────────────────────────────────────────────

let counter = 1;

const vitals = [
  {
    id: 'V001',
    patientID: 'P001',
    timestamp: new Date().toISOString(),
    heartRate: 82,
    systolicBP: 138,
    diastolicBP: 88,
    respRate: 18,
    spo2: 96,
    temperature: 98.8,
  },
  {
    id: 'V002',
    patientID: 'P002',
    timestamp: new Date().toISOString(),
    heartRate: 72,
    systolicBP: 118,
    diastolicBP: 76,
    respRate: 16,
    spo2: 99,
    temperature: 98.4,
  },
  {
    id: 'V003',
    patientID: 'P003',
    timestamp: new Date().toISOString(),
    heartRate: 104,
    systolicBP: 155,
    diastolicBP: 95,
    respRate: 28,
    spo2: 88,
    temperature: 101.2,
  },
];

function getByPatientID(patientID) {
  return vitals.filter((v) => v.patientID === patientID);
}

function getLatest(patientID) {
  const patientVitals = getByPatientID(patientID);
  return patientVitals.length > 0 ? patientVitals[patientVitals.length - 1] : null;
}

function record(data) {
  const entry = {
    id: `V${String(counter++).padStart(3, '0')}`,
    patientID: data.patientID,
    timestamp: new Date().toISOString(),
    heartRate: data.heartRate,
    systolicBP: data.systolicBP,
    diastolicBP: data.diastolicBP,
    respRate: data.respRate,
    spo2: data.spo2,
    temperature: data.temperature,
  };
  vitals.push(entry);
  return entry;
}

/**
 * Generate a simulated vital sign reading with random variance
 * for real-time monitoring of admitted patients.
 */
function simulateReading(patientID) {
  const latest = getLatest(patientID);
  if (!latest) return null;

  const jitter = (base, range) => +(base + (Math.random() * range * 2 - range)).toFixed(1);

  return {
    patientID,
    timestamp: new Date().toISOString(),
    heartRate: Math.round(jitter(latest.heartRate, 5)),
    systolicBP: Math.round(jitter(latest.systolicBP, 8)),
    diastolicBP: Math.round(jitter(latest.diastolicBP, 5)),
    respRate: Math.round(jitter(latest.respRate, 3)),
    spo2: Math.min(100, Math.round(jitter(latest.spo2, 2))),
    temperature: jitter(latest.temperature, 0.3),
  };
}

module.exports = { vitals, getByPatientID, getLatest, record, simulateReading };
