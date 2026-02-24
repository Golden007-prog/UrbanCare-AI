// ──────────────────────────────────────────────────────────
// Patient Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

const PatientModel = require('../models/Patient');

function listByHospital(hospitalID) {
  return PatientModel.findByHospitalID(hospitalID);
}

function getById(id, hospitalID) {
  const patient = PatientModel.findById(id);
  if (!patient) return null;
  if (patient.hospitalID !== hospitalID) return null;
  return patient;
}

function create(data) {
  // Derive monitoring from admission status
  const isAdmitted = data.admissionStatus === 'admitted';
  return PatientModel.create({
    ...data,
    admissionStatus: isAdmitted ? 'admitted' : 'not_admitted',
    patientType: isAdmitted ? 'admitted' : 'private',
    monitoringEnabled: isAdmitted,
    // Pass vitals only if admitted
    heartRate: isAdmitted ? data.heartRate : null,
    spo2: isAdmitted ? data.spo2 : null,
    temperature: isAdmitted ? data.temperature : null,
    respiration: isAdmitted ? data.respiration : null,
  });
}

function update(id, updates, hospitalID) {
  const patient = PatientModel.findById(id);
  if (!patient || patient.hospitalID !== hospitalID) return null;
  return PatientModel.update(id, updates);
}

function admit(id, hospitalID) {
  const patient = PatientModel.findById(id);
  if (!patient || patient.hospitalID !== hospitalID) return null;
  return PatientModel.update(id, {
    patientType: 'admitted',
    admissionStatus: 'admitted',
    monitoringEnabled: true,
  });
}

function discharge(id, hospitalID) {
  const patient = PatientModel.findById(id);
  if (!patient || patient.hospitalID !== hospitalID) return null;
  return PatientModel.update(id, {
    admissionStatus: 'discharged',
    monitoringEnabled: false,
  });
}

module.exports = { listByHospital, getById, create, update, admit, discharge };
