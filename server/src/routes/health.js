// ──────────────────────────────────────────────────────────
// Health Check Route — GET /health
// ──────────────────────────────────────────────────────────

const express = require('express');
const { testConnection } = require('../config/db');

const router = express.Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'unknown';

  try {
    const connected = await testConnection();
    dbStatus = connected ? 'connected' : 'disconnected';
  } catch {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    message: 'UrbanCare API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

module.exports = router;
