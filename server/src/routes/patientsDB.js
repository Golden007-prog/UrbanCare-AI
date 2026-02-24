// ──────────────────────────────────────────────────────────
// Patients (AlloyDB) Route — GET /api/db/patients
// ──────────────────────────────────────────────────────────

const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// ── GET /api/db/patients — Fetch all patients from AlloyDB ──

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      'SELECT * FROM patients ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error('❌  Failed to fetch patients:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve patients from the database.',
    });
  }
});

// ── GET /api/db/patients/:id — Fetch a single patient ──

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM patients WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found.',
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('❌  Failed to fetch patient:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient from the database.',
    });
  }
});

module.exports = router;
