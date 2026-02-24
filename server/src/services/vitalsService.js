// ──────────────────────────────────────────────────────────
// Vitals Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

const VitalsModel = require('../models/Vitals');
const PatientModel = require('../models/Patient');

function getHistory(patientID) {
  return VitalsModel.getByPatientID(patientID);
}

function getLatest(patientID) {
  return VitalsModel.getLatest(patientID);
}

function record(data) {
  return VitalsModel.record(data);
}

/**
 * Start a simulated live vitals stream via Server-Sent Events.
 * Only works for admitted patients.
 */
function startLiveStream(patientID, res) {
  const patient = PatientModel.findById(patientID);
  if (!patient || patient.admissionStatus !== 'admitted') {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const interval = setInterval(() => {
    const reading = VitalsModel.simulateReading(patientID);
    if (reading) {
      res.write(`data: ${JSON.stringify(reading)}\n\n`);
    }
  }, 3000); // every 3 seconds

  // Clean up on client disconnect
  res.on('close', () => {
    clearInterval(interval);
    res.end();
  });

  return true;
}

module.exports = { getHistory, getLatest, record, startLiveStream };
