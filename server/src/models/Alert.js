// ──────────────────────────────────────────────────────────
// Alert Model — In-Memory Store
// ──────────────────────────────────────────────────────────

let counter = 1;

const alerts = [
  {
    id: 'A001',
    patientID: 'P003',
    type: 'critical',
    message: 'SpO2 dropped below 90%. Immediate attention required.',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'A002',
    patientID: 'P001',
    type: 'warning',
    message: 'Blood pressure trending upward over the past 6 hours.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

function getByPatientID(patientID) {
  return alerts.filter((a) => a.patientID === patientID);
}

function create(data) {
  const alert = {
    id: `A${String(counter++).padStart(3, '0')}`,
    patientID: data.patientID,
    type: data.type || 'info',
    message: data.message,
    createdAt: new Date().toISOString(),
  };
  alerts.push(alert);
  return alert;
}

module.exports = { alerts, getByPatientID, create };
