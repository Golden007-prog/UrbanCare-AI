// ──────────────────────────────────────────────────────────
// Dashboard Overview Routes — /api/dashboard
// Hospital admin, doctor, and cross-role overview endpoints
// ──────────────────────────────────────────────────────────

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/db');
const { users, findByHospital } = require('../models/User');
const PatientModel = require('../models/Patient');
const {
  getDemoBeds,
  getDemoPatientProfiles,
  getDemoPatientDocuments,
  getDemoLabReports,
  getDemoPharmacyBills,
} = require('../data/seedDemoData');

const router = express.Router();
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// GET /api/dashboard/hospital/:id/overview
// Hospital admin overview — beds, staff, labs, pharmacy
// ──────────────────────────────────────────────────────────

router.get('/hospital/:id/overview', async (req, res) => {
  try {
    const hospitalId = req.params.id;

    // Get all staff for this hospital
    const staff = findByHospital(hospitalId).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      specialty: u.specialty,
    }));

    // Get beds
    let beds = getDemoBeds(hospitalId);
    try {
      const dbBeds = await query('SELECT * FROM beds WHERE hospital_id = $1', [hospitalId]);
      if (dbBeds.rows.length > 0) beds = dbBeds.rows;
    } catch (_) {}

    // Get patients
    const patients = PatientModel.findByHospitalID(hospitalId);

    // Get patient profiles
    const profiles = getDemoPatientProfiles(hospitalId);

    // Get lab reports
    const labReports = getDemoLabReports(hospitalId);

    // Get pharmacy bills
    const pharmacyBills = getDemoPharmacyBills(hospitalId);

    // Calculate stats
    const stats = {
      totalBeds: beds.length,
      occupiedBeds: beds.filter((b) => b.occupied).length,
      availableBeds: beds.filter((b) => !b.occupied).length,
      totalStaff: staff.length,
      doctors: staff.filter((s) => s.role === 'doctor').length,
      labTechs: staff.filter((s) => s.role === 'lab' || s.role === 'laboratory').length,
      pharmacists: staff.filter((s) => s.role === 'pharmacist').length,
      admins: staff.filter((s) => s.role === 'hospital_admin' || s.role === 'admin').length,
      totalPatients: patients.length + profiles.length,
      pendingLabReports: labReports.filter((r) => r.status === 'pending').length,
      completedLabReports: labReports.filter((r) => r.status === 'complete').length,
      unpaidBills: pharmacyBills.filter((b) => b.status === 'unpaid').length,
      totalRevenue: pharmacyBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0),
    };

    res.json({
      success: true,
      data: { stats, staff, beds, patients, profiles, labReports, pharmacyBills },
    });
  } catch (err) {
    console.error('❌ Hospital overview error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/dashboard/doctor/patients
// Doctor's patient list — hospital-scoped
// ──────────────────────────────────────────────────────────

router.get('/doctor/patients', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalID;

    // In-memory patients
    const patients = PatientModel.findByHospitalID(hospitalId);

    // Enrich with profile data
    const profiles = getDemoPatientProfiles(hospitalId);
    const enriched = patients.map((p) => {
      const profile = profiles.find((pr) => pr.condition === p.primaryCondition);
      return {
        ...p,
        profile: profile || null,
        bed: profile ? getDemoBeds(hospitalId).find((b) => b.id === profile.bed_id) : null,
      };
    });

    // Also include profile-only patients
    const profileOnlyPatients = profiles
      .filter((pr) => !patients.some((p) => p.primaryCondition === pr.condition))
      .map((pr) => ({
        id: pr.user_id,
        hospitalID: pr.hospital_id,
        name: pr.user_id,
        age: pr.age,
        gender: pr.gender,
        primaryCondition: pr.condition,
        riskLevel: 'Stable',
        patientType: 'admitted',
        admissionStatus: 'admitted',
        profile: pr,
        bed: getDemoBeds(hospitalId).find((b) => b.id === pr.bed_id),
      }));

    res.json({ success: true, data: [...enriched, ...profileOnlyPatients] });
  } catch (err) {
    console.error('❌ Doctor patients error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/dashboard/doctor/patient-docs/:patientId
// Doctor access to a patient's uploaded documents
// ──────────────────────────────────────────────────────────

router.get('/doctor/patient-docs/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    // Try to find profile by user ID or profile ID
    let docs = getDemoPatientDocuments(patientId);

    // If no docs found by profile ID, try to find the profile for this patient
    if (docs.length === 0) {
      const profiles = getDemoPatientProfiles();
      const profile = profiles.find((p) => p.user_id === patientId || p.id === patientId);
      if (profile) {
        docs = getDemoPatientDocuments(profile.id);
      }
    }

    // Also try AlloyDB
    if (docs.length === 0) {
      try {
        const result = await query(
          'SELECT * FROM patient_documents WHERE patient_profile_id = $1 ORDER BY created_at DESC',
          [patientId]
        );
        docs = result.rows;
      } catch (_) {}
    }

    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('❌ Patient docs error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/dashboard/lab/reports
// Lab reports for the lab user's hospital
// ──────────────────────────────────────────────────────────

router.get('/lab/reports', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalID;
    let reports = getDemoLabReports(hospitalId);

    try {
      const result = await query('SELECT * FROM lab_reports WHERE hospital_id = $1 ORDER BY created_at DESC', [hospitalId]);
      if (result.rows.length > 0) reports = result.rows;
    } catch (_) {}

    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/dashboard/pharmacy/bills
// Pharmacy bills for the pharmacist's hospital
// ──────────────────────────────────────────────────────────

router.get('/pharmacy/bills', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalID;
    let bills = getDemoPharmacyBills(hospitalId);

    try {
      const result = await query('SELECT * FROM pharmacy_bills WHERE hospital_id = $1 ORDER BY created_at DESC', [hospitalId]);
      if (result.rows.length > 0) bills = result.rows;
    } catch (_) {}

    res.json({ success: true, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

module.exports = router;
