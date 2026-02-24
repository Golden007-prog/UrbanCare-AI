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
  return PatientModel.create(data);
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
  });
}

function discharge(id, hospitalID) {
  const patient = PatientModel.findById(id);
  if (!patient || patient.hospitalID !== hospitalID) return null;
  return PatientModel.update(id, {
    admissionStatus: 'discharged',
  });
}

module.exports = { listByHospital, getById, create, update, admit, discharge };
