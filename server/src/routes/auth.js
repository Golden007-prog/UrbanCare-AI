const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { findByEmail, findByGoogleId, sanitize, createUser, users } = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/db');
const credentialStore = require('../services/credentialStore');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,                           // JS cannot read the cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax',                          // CSRF protection
  maxAge: 24 * 60 * 60 * 1000,             // 24 hours
  path: '/',
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, hospitalID: user.hospitalID },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// ──────────────────────────────────────────────────────────
// POST /auth/login — Email + password login
// ──────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Try in-memory store first
  let user = findByEmail(email);

  // Fallback to AlloyDB if not in memory
  if (!user) {
    try {
      const result = await query(
        'SELECT id, name, email, password_hash, role, hospital_id, specialty, created_at FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );
      if (result.rows.length > 0) {
        const dbUser = result.rows[0];
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          passwordHash: dbUser.password_hash,
          role: dbUser.role,
          hospitalID: dbUser.hospital_id,
          specialty: dbUser.specialty,
          createdAt: dbUser.created_at,
        };
      }
    } catch (dbErr) {
      console.error('⚠️  DB lookup failed during login:', dbErr.message);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Google-only accounts have no password hash
  if (!user.passwordHash) {
    return res
      .status(401)
      .json({ error: 'This account uses Google sign-in. Please log in with Google.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signToken(user);
  res
    .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    .json({ message: 'Login successful', user: sanitize(user) });
});

// ──────────────────────────────────────────────────────────
// POST /auth/demo-login — Quick demo access by role
// ──────────────────────────────────────────────────────────

const DEMO_ROLE_MAP = {
  SUPER_ADMIN:    'admin@demo.com',
  HOSPITAL_ADMIN: 'hospital@demo.com',
  DOCTOR:         'doctor@demo.com',
  PATIENT:        'patient@demo.com',
  LAB:            'lab@demo.com',
  PHARMACIST:     'pharma@demo.com',
};

router.post('/demo-login', (req, res) => {
  const { role } = req.body;

  if (!role || !DEMO_ROLE_MAP[role]) {
    return res.status(400).json({
      error: `Invalid role. Must be one of: ${Object.keys(DEMO_ROLE_MAP).join(', ')}`,
    });
  }

  const demoEmail = DEMO_ROLE_MAP[role];
  const user = findByEmail(demoEmail);

  if (!user) {
    return res.status(500).json({ error: `Demo user for role ${role} not found.` });
  }

  const token = signToken(user);
  res
    .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    .json({ message: 'Demo login successful', user: sanitize(user) });
});

// ──────────────────────────────────────────────────────────
// POST /auth/register — Create a new user account
// ──────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, specialty, hospital_id, address, age, gender } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const allowedRoles = ['doctor', 'patient', 'laboratory', 'pharmacist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists (in-memory first, then DB)
    const existingLocal = findByEmail(email);
    if (existingLocal) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = `U-${crypto.randomUUID().slice(0, 8)}`;

    // Insert into AlloyDB
    let newUser;
    try {
      const insertSQL = `
        INSERT INTO users (id, name, email, password_hash, role, hospital_id, specialty, address, age, gender)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name, email, role, hospital_id, specialty, created_at
      `;
      const values = [
        userId,
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        role,
        hospital_id || null,
        specialty || null,
        address || null,
        age ? parseInt(age) : null,
        gender || null,
      ];

      const result = await query(insertSQL, values);
      newUser = result.rows[0];
      // Normalize for JWT
      newUser.hospitalID = newUser.hospital_id;
      console.log(`✅  User registered in AlloyDB: ${newUser.email} (${newUser.role})`);
    } catch (dbErr) {
      // Handle DB unique violation
      if (dbErr.code === '23505') {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      console.error('⚠️  AlloyDB insert failed, falling back to in-memory:', dbErr.message);
      // Fallback to in-memory
      newUser = createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        hospitalID: hospital_id || null,
        specialty: specialty || null,
      });
    }

    // Sign JWT and set cookie
    const token = signToken(newUser);
    res
      .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      .status(201)
      .json({
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          hospitalID: newUser.hospitalID || newUser.hospital_id,
        },
      });
  } catch (err) {
    console.error('❌  Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /auth/google — Initiate Google OAuth flow
// ──────────────────────────────────────────────────────────

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// ──────────────────────────────────────────────────────────
// GET /auth/google/callback — Google OAuth callback
// ──────────────────────────────────────────────────────────

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login-failed' }),
  (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // If the user is brand-new (role === 'pending'), redirect to role selection
    if (req.user.role === 'pending') {
      const params = new URLSearchParams({
        auth: 'google-pending',
        googleId: req.user.googleId || '',
        email: req.user.email || '',
        name: req.user.name || '',
      });
      return res.redirect(`${clientUrl}?${params.toString()}`);
    }

    // Existing user — sign JWT and redirect
    const token = signToken(req.user);
    res
      .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      .redirect(`${clientUrl}?auth=success`);
  }
);

// ──────────────────────────────────────────────────────────
// POST /auth/complete-google-signup — Assign role after Google OAuth
// ──────────────────────────────────────────────────────────

router.post('/complete-google-signup', (req, res) => {
  const { googleId, email, name, role } = req.body;

  if (!googleId || !role) {
    return res.status(400).json({ error: 'googleId and role are required.' });
  }

  const allowedRoles = ['doctor', 'patient', 'laboratory', 'pharmacist'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
  }

  // Find existing pending user by googleId
  let user = findByGoogleId(googleId);

  if (user) {
    // Update the pending user with the selected role
    user.role = role;
    user.name = name || user.name;
    user.hospitalID = 'H001'; // default hospital for new users
  } else {
    // Fallback: create new user with the role
    user = createUser({
      name: name || 'User',
      email: email || `google_${googleId}@urbancare.com`,
      role,
      hospitalID: 'H001',
    });
    user.googleId = googleId;
  }

  const token = signToken(user);
  res
    .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    .json({ message: 'Google signup complete', user: sanitize(user) });
});

// ──────────────────────────────────────────────────────────
// GET /auth/me — Return the currently authenticated user
// ──────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ──────────────────────────────────────────────────────────
// POST /auth/logout — Clear the JWT cookie
// ──────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  // Clear stored API credentials before destroying the session
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      credentialStore.clear(decoded.id);
      console.log(`🗑️  Credentials cleared on logout for user ${decoded.id}`);
    }
  } catch {
    // Token may be expired/invalid — that's fine, cookie is being cleared anyway
  }

  res
    .clearCookie(COOKIE_NAME, { path: '/' })
    .json({ message: 'Logged out successfully' });
});

// ──────────────────────────────────────────────────────────
// GET /auth/login-failed — OAuth failure fallback
// ──────────────────────────────────────────────────────────

router.get('/login-failed', (_req, res) => {
  res.status(401).json({ error: 'Google authentication failed.' });
});

module.exports = router;
