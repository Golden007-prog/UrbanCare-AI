// ──────────────────────────────────────────────────────────
// UrbanCare Auth Server — Entry Point
// ──────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/auth');
const aiRouter = require('./ai/router');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // allow cookies to be sent cross-origin
  })
);

// ── Passport Initialization ───────────────────────────────

configurePassport();
app.use(passport.initialize());

// ── Routes ─────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/api', aiRouter);

// Health check
app.get('/', (_req, res) => {
  res.json({
    service: 'UrbanCare Auth Server',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ── Start Server ───────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🏥  UrbanCare Server listening on http://localhost:${PORT}`);
  console.log(`   POST /auth/login              — Email + password login`);
  console.log(`   GET  /auth/google             — Google OAuth`);
  console.log(`   GET  /auth/google/callback    — Google callback`);
  console.log(`   GET  /auth/me                 — Current user (protected)`);
  console.log(`   POST /auth/logout             — Logout`);
  console.log(`   ──── AI Routes ────`);
  console.log(`   POST /api/analyze-image       — Medical image analysis (MedGemma)`);
  console.log(`   POST /api/generate-soap       — SOAP note generation (TxGemma)`);
  console.log(`   POST /api/generate-referral   — Referral summary (TxGemma)`);
  console.log(`   POST /api/assistant-chat      — AI assistant chat (TxGemma)`);
  console.log(`   POST /api/ai-consult          — Multilingual AI Copilot (Gemini)`);
  console.log(`   GET  /api/models              — List available models\n`);
});

module.exports = app;
