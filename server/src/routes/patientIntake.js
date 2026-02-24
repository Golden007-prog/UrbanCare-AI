// ──────────────────────────────────────────────────────────
// Patient Intake Routes — /api/patient
// Handles: onboarding, profile, documents, AI summary
// Pattern: AlloyDB first → in-memory fallback
// ──────────────────────────────────────────────────────────

const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/db');
const {
  getDemoBeds,
  getDemoPatientProfileByUserId,
  getDemoPatientDocuments,
  getAllDemoPatientDocuments,
} = require('../data/seedDemoData');

const router = express.Router();

// ── In-memory fallback stores ─────────────────────────────

const memoryProfiles = [];
const memoryBeds = [];

// Seed some demo beds
const DEMO_HOSPITALS = ['H001', 'H002', 'H003'];
DEMO_HOSPITALS.forEach((hid) => {
  for (let i = 1; i <= 10; i++) {
    memoryBeds.push({
      id: `BED-${hid}-${String(i).padStart(3, '0')}`,
      hospital_id: hid,
      bed_number: `${String.fromCharCode(65 + Math.floor((i - 1) / 5))}${((i - 1) % 5) + 1}`,
      ward: i <= 5 ? 'General' : 'ICU',
      occupied: false,
      patient_profile_id: null,
    });
  }
});

// ── All patient routes require auth ───────────────────────
router.use(requireAuth);

// ──────────────────────────────────────────────────────────
// POST /api/patient/onboard — Create patient profile
// ──────────────────────────────────────────────────────────

router.post('/onboard', async (req, res) => {
  try {
    const { hospital_id, age, gender, condition } = req.body;
    const userId = req.user.id;

    if (!hospital_id) {
      return res.status(400).json({ success: false, error: 'hospital_id is required.' });
    }

    const profileId = `PP-${crypto.randomUUID().slice(0, 8)}`;

    // Try AlloyDB first
    let profile;
    try {
      const insertSQL = `
        INSERT INTO patient_profiles (id, user_id, hospital_id, age, gender, condition, onboarded)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING *
      `;
      const values = [
        profileId,
        userId,
        hospital_id,
        age ? parseInt(age) : null,
        gender || null,
        condition || null,
      ];
      const result = await query(insertSQL, values);
      profile = result.rows[0];
      console.log(`✅  Patient profile created in AlloyDB: ${profileId}`);
    } catch (dbErr) {
      // Fallback to in-memory
      console.warn('⚠️  AlloyDB insert failed, using memory fallback:', dbErr.message);
      profile = {
        id: profileId,
        user_id: userId,
        hospital_id,
        bed_id: null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        condition: condition || null,
        onboarded: true,
        created_at: new Date().toISOString(),
      };
      memoryProfiles.push(profile);
    }

    // Try to assign a bed
    let assignedBed = null;
    try {
      const bedResult = await query(
        `UPDATE beds SET occupied = TRUE, patient_profile_id = $1
         WHERE id = (SELECT id FROM beds WHERE hospital_id = $2 AND occupied = FALSE LIMIT 1)
         RETURNING *`,
        [profileId, hospital_id]
      );
      if (bedResult.rows.length > 0) {
        assignedBed = bedResult.rows[0];
        await query('UPDATE patient_profiles SET bed_id = $1 WHERE id = $2', [assignedBed.id, profileId]);
        profile.bed_id = assignedBed.id;
      }
    } catch (bedErr) {
      // Try memory fallback for beds
      const freeBed = memoryBeds.find((b) => b.hospital_id === hospital_id && !b.occupied);
      if (freeBed) {
        freeBed.occupied = true;
        freeBed.patient_profile_id = profileId;
        profile.bed_id = freeBed.id;
        assignedBed = freeBed;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        profile,
        bed: assignedBed,
      },
      message: 'Patient onboarded successfully.',
    });
  } catch (err) {
    console.error('❌  Onboarding error:', err);
    res.status(500).json({ success: false, error: 'Server error during onboarding.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/profile — Get current patient's profile
// ──────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    // Try AlloyDB first
    let profile = null;
    try {
      const result = await query(
        'SELECT pp.*, h.name as hospital_name, b.bed_number, b.ward FROM patient_profiles pp LEFT JOIN hospitals h ON pp.hospital_id = h.id LEFT JOIN beds b ON pp.bed_id = b.id WHERE pp.user_id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        profile = result.rows[0];
      }
    } catch (dbErr) {
      console.warn('⚠️  DB lookup failed:', dbErr.message);
    }

    // Fallback to memory
    if (!profile) {
      profile = memoryProfiles.find((p) => p.user_id === userId) || null;
    }

    // Fallback to seed data
    if (!profile) {
      profile = getDemoPatientProfileByUserId(userId);
    }

    if (profile) {
      // Enrich with bed info
      if (!profile.bed_number && profile.bed_id) {
        const beds = getDemoBeds(profile.hospital_id);
        const bed = beds.find((b) => b.id === profile.bed_id) || memoryBeds.find((b) => b.id === profile.bed_id);
        if (bed) {
          profile.bed_number = bed.bed_number;
          profile.ward = bed.ward;
        }
      }
    }

    if (!profile) {
      return res.json({ success: true, data: null, onboarded: false });
    }

    res.json({ success: true, data: profile, onboarded: true });
  } catch (err) {
    console.error('❌  Profile fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/documents — List patient's documents
// ──────────────────────────────────────────────────────────

router.get('/documents', async (req, res) => {
  try {
    const userId = req.user.id;

    // Find patient profile first
    let profileId = null;
    try {
      const profileResult = await query(
        'SELECT id FROM patient_profiles WHERE user_id = $1',
        [userId]
      );
      if (profileResult.rows.length > 0) {
        profileId = profileResult.rows[0].id;
      }
    } catch (dbErr) {
      const memProfile = memoryProfiles.find((p) => p.user_id === userId);
      if (memProfile) profileId = memProfile.id;
    }

    if (!profileId) {
      return res.json({ success: true, data: [] });
    }

    // Get documents
    let docs = [];
    try {
      const result = await query(
        'SELECT * FROM patient_documents WHERE patient_profile_id = $1 ORDER BY created_at DESC',
        [profileId]
      );
      docs = result.rows;
    } catch (dbErr) {
      console.warn('⚠️  DB doc lookup failed:', dbErr.message);
    }

    // Fallback to seed data
    if (docs.length === 0 && profileId) {
      docs = getDemoPatientDocuments(profileId);
    }

    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('❌  Documents fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/ai-summary — Get AI analysis summary
// ──────────────────────────────────────────────────────────

router.get('/ai-summary', async (req, res) => {
  try {
    const userId = req.user.id;

    let profileId = null;
    try {
      const profileResult = await query(
        'SELECT id FROM patient_profiles WHERE user_id = $1',
        [userId]
      );
      if (profileResult.rows.length > 0) profileId = profileResult.rows[0].id;
    } catch (dbErr) {
      const memProfile = memoryProfiles.find((p) => p.user_id === userId);
      if (memProfile) profileId = memProfile.id;
    }

    if (!profileId) {
      return res.json({ success: true, data: null });
    }

    // Aggregate AI summaries from all documents
    let summaries = [];
    try {
      const result = await query(
        "SELECT type, ai_summary, original_name, created_at FROM patient_documents WHERE patient_profile_id = $1 AND ai_summary IS NOT NULL AND status = 'complete' ORDER BY created_at DESC",
        [profileId]
      );
      summaries = result.rows;
    } catch (dbErr) {
      console.warn('⚠️  AI summary lookup failed:', dbErr.message);
    }

    // Fallback to seed data
    if (summaries.length === 0 && profileId) {
      summaries = getDemoPatientDocuments(profileId).filter((d) => d.ai_summary && d.status === 'complete');
    }

    // Combine into single summary object
    const combined = {
      medications: [],
      diagnoses: [],
      risks: [],
      summaries: [],
    };

    for (const doc of summaries) {
      const ai = doc.ai_summary || {};
      if (ai.medications) combined.medications.push(...ai.medications);
      if (ai.diagnosis) combined.diagnoses.push(ai.diagnosis);
      if (ai.risks) combined.risks.push(...ai.risks);
      if (ai.summary) combined.summaries.push({ source: doc.type, text: ai.summary, file: doc.original_name, date: doc.created_at });
    }

    res.json({ success: true, data: combined });
  } catch (err) {
    console.error('❌  AI summary error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/hospitals — List hospitals for onboarding
// ──────────────────────────────────────────────────────────

router.get('/hospitals', async (_req, res) => {
  try {
    let hospitals = [];
    try {
      const result = await query('SELECT id, name, address, contact_email FROM hospitals ORDER BY name');
      hospitals = result.rows;
    } catch (dbErr) {
      console.warn('⚠️  DB hospital lookup failed, using defaults:', dbErr.message);
    }

    // Fallback defaults
    if (hospitals.length === 0) {
      hospitals = [
        { id: 'H001', name: 'UrbanCare Medical Center', address: 'Metro Healthcare Campus, Block A' },
        { id: 'H002', name: 'City General Hospital', address: 'Downtown Medical District, Tower B' },
        { id: 'H003', name: 'Green Valley Clinic', address: 'Suburban Health Park, Unit 5' },
      ];
    }

    res.json({ success: true, data: hospitals });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/beds/:hospitalId — Available beds
// ──────────────────────────────────────────────────────────

router.get('/beds/:hospitalId', async (req, res) => {
  try {
    let beds = [];
    try {
      const result = await query(
        'SELECT id, bed_number, ward, occupied FROM beds WHERE hospital_id = $1 ORDER BY ward, bed_number',
        [req.params.hospitalId]
      );
      beds = result.rows;
    } catch (dbErr) {
      // Fallback: use seed data first, then memory
      beds = getDemoBeds(req.params.hospitalId);
      if (beds.length === 0) {
        beds = memoryBeds
          .filter((b) => b.hospital_id === req.params.hospitalId)
          .map(({ id, bed_number, ward, occupied }) => ({ id, bed_number, ward, occupied }));
      }
    }

    res.json({ success: true, data: beds });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/patient/documents-for/:profileId — Doctor access
// Allows doctors to view a specific patient's documents
// ──────────────────────────────────────────────────────────

router.get('/documents-for/:profileId', requireRole('doctor', 'hospital_admin', 'super_admin'), async (req, res) => {
  try {
    let docs = [];
    try {
      const result = await query(
        'SELECT * FROM patient_documents WHERE patient_profile_id = $1 ORDER BY created_at DESC',
        [req.params.profileId]
      );
      docs = result.rows;
    } catch (dbErr) {
      console.warn('⚠️  DB doc lookup failed:', dbErr.message);
    }

    // Fallback to seed data
    if (docs.length === 0) {
      docs = getDemoPatientDocuments(req.params.profileId);
    }

    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

module.exports = router;
