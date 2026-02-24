// ──────────────────────────────────────────────────────────
// UrbanCare Auth Server — Entry Point
// ──────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/auth');
const aiRouter = require('./ai/router');
const patientsRouter = require('./routes/patients');
const vitalsRouter = require('./routes/vitals');
const documentsRouter = require('./routes/documents');
const alertsRouter = require('./routes/alerts');
const familyRouter = require('./routes/family');
const documentUploadRouter = require('./routes/documentUpload');
const agentRoutes = require('./routes/agentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hospitalAdminRoutes = require('./routes/hospitalAdminRoutes');
const healthRouter = require('./routes/health');
const patientsDBRouter = require('./routes/patientsDB');
const uploadReportRouter = require('./routes/uploadReport');
const xrayRoutes = require('./routes/xrayRoutes');
const { registerAllAgents } = require('./agents/index');
const { seedDemoData } = require('./data/seedDemoData');
const voiceRoutes = require('./routes/voiceRoutes');
const patientIntakeRouter = require('./routes/patientIntake');
const patientUploadRouter = require('./routes/patientUpload');
const dashboardOverviewRouter = require('./routes/dashboardOverview');
const { deleteExpiredChats } = require('./agents/VoiceClinicalCopilotAgent');

// ── Initialize Agents ──────────────────────────────────────
registerAllAgents();

// ── Seed demo data for admin panels ────────────────────────
seedDemoData();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ──────────────────────────────────────

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ── CORS — Allow Vite dev, local prod, and deployed frontend ──
const allowedOrigins = [
  'http://localhost:5173',        // Vite dev default
  'http://localhost:3000',        // Local production preview
  'http://localhost:3001',        // Alternate local port
  process.env.CLIENT_URL,         // Env-configurable
  'https://github.com/Golden007-prog/UrbanCare-AI',  // Production
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true, // allow cookies & auth headers cross-origin
  })
);

// ── Passport Initialization ───────────────────────────────

configurePassport();
app.use(passport.initialize());

// ── Routes ─────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api', aiRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/patients/:patientId/vitals', vitalsRouter);
app.use('/api/patients/:patientId/documents', documentsRouter);
app.use('/api/family', familyRouter);
app.use('/api/documents', documentUploadRouter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/admin', adminRoutes);
app.use('/health', healthRouter);
app.use('/api/db/patients', patientsDBRouter);
app.use('/api/upload-report', uploadReportRouter);
app.use('/api/hospital-admin', hospitalAdminRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/xray', xrayRoutes);
app.use('/api/patient', patientIntakeRouter);
app.use('/api/patient/upload', patientUploadRouter);
app.use('/api/dashboard', dashboardOverviewRouter);

// Health check
app.get('/', (_req, res) => {
  res.json({
    service: 'UrbanCare Auth Server',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ── Cron: Delete expired voice chats daily at midnight ────
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    console.log('🗑️  Running daily voice chat cleanup...');
    deleteExpiredChats();
  }
}, 60 * 1000); // check every minute

// ── Start Server ───────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🏥  UrbanCare Server listening on http://localhost:${PORT}`);
  console.log(`   POST /auth/login              — Email + password login`);
  console.log(`   GET  /auth/google             — Google OAuth`);
  console.log(`   GET  /auth/google/callback    — Google callback`);
  console.log(`   GET  /auth/me                 — Current user (protected)`);
  console.log(`   POST /auth/logout             — Logout`);
  console.log(`   ──── Patient Routes ────`);
  console.log(`   GET  /api/patients            — List patients (hospital-scoped)`);
  console.log(`   POST /api/patients            — Create patient`);
  console.log(`   POST /api/patients/:id/admit   — Admit patient`);
  console.log(`   POST /api/patients/:id/discharge — Discharge patient`);
  console.log(`   ──── Vitals Routes ────`);
  console.log(`   GET  /api/patients/:id/vitals  — Get vitals history`);
  console.log(`   POST /api/patients/:id/vitals  — Record vitals`);
  console.log(`   GET  /api/patients/:id/vitals/live — Live vitals stream (SSE)`);
  console.log(`   ──── Document Routes ────`);
  console.log(`   GET  /api/patients/:id/documents — List documents`);
  console.log(`   POST /api/patients/:id/documents — Upload document`);
  console.log(`   ──── Family Routes ────`);
  console.log(`   POST /api/family/generate-link — Generate family access link`);
  console.log(`   GET  /api/family/:token        — Public family portal`);
  console.log(`   ──── AI Routes ────`);
  console.log(`   POST /api/analyze-image       — MedGemma legacy`);
  console.log(`   POST /api/generate-soap       — TxGemma legacy`);
  console.log(`   POST /api/generate-referral   — TxGemma legacy`);
  console.log(`   POST /api/assistant-chat      — TxGemma legacy`);
  console.log(`   POST /api/ai-consult          — Gemini copilot legacy`);
  console.log(`   GET  /api/models              — List legacy models`);
  console.log(`   ──── 30-Agent Routes ────`);
  console.log(`   GET  /api/agents              — List all 30 agents`);
  console.log(`   GET  /api/agents/architecture — Full architecture diagram`);
  console.log(`   POST /api/agents/pipeline     — Run 8-layer pipeline`);
  console.log(`   POST /api/agents/:id/execute  — Execute single agent`);
  console.log(`   ──── Database + Storage Routes ────`);
  console.log(`   GET  /health                  — Health check + DB status`);
  console.log(`   GET  /api/db/patients          — AlloyDB patients list`);
  console.log(`   GET  /api/db/patients/:id      — AlloyDB single patient`);
  console.log(`   POST /api/upload-report        — Upload file → GCS + DB`);
  console.log(`   ──── Voice Clinical Copilot ────`);
  console.log(`   POST /api/voice/message        — Process voice/text message`);
  console.log(`   GET  /api/voice/history/:id    — Fetch chat history`);
  console.log(`   DELETE /api/voice/history/:id  — Delete specific chat`);
  console.log(`   DELETE /api/voice/cleanup      — Manual expired cleanup`);
  console.log(`   ──── Patient Intake + Dashboard ────`);
  console.log(`   POST /api/patient/onboard       — Patient onboarding`);
  console.log(`   POST /api/patient/upload         — Patient document upload`);
  console.log(`   GET  /api/patient/profile        — Patient profile`);
  console.log(`   GET  /api/dashboard/hospital/:id — Hospital overview`);
  console.log(`   GET  /api/dashboard/doctor/patients — Doctor's patients`);
  console.log(`   GET  /api/dashboard/doctor/patient-docs/:id — Patient docs`);
  console.log(`   GET  /api/dashboard/lab/reports  — Lab reports`);
  console.log(`   GET  /api/dashboard/pharmacy/bills — Pharmacy bills\n`);
});

module.exports = app;

