// ──────────────────────────────────────────────────────────
// Family Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

const FamilyAccessModel = require('../models/FamilyAccess');
const PatientModel = require('../models/Patient');
const VitalsModel = require('../models/Vitals');
const AlertModel = require('../models/Alert');

function generateToken(patientID, familyUserID) {
  return FamilyAccessModel.generateToken(patientID, familyUserID);
}

function validateToken(token) {
  return FamilyAccessModel.findByToken(token);
}

/**
 * Build the read-only portal data for a family access token.
 */
function getPortalData(token) {
  const access = FamilyAccessModel.findByToken(token);
  if (!access) return null;

  const patient = PatientModel.findById(access.patientID);
  if (!patient) return null;

  const latestVitals = VitalsModel.getLatest(access.patientID);
  const alerts = AlertModel.getByPatientID(access.patientID);

  return {
    patient: {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      primaryCondition: patient.primaryCondition,
      riskLevel: patient.riskLevel,
      admissionStatus: patient.admissionStatus,
    },
    vitals: latestVitals,
    alerts: alerts.slice(-10), // last 10 alerts
    permissionLevel: access.permissionLevel,
    expiresAt: access.expiresAt,
  };
}

module.exports = { generateToken, validateToken, getPortalData };
