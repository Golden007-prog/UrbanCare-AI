const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findByEmail, sanitize } = require('../data/doctors');
const requireAuth = require('../middleware/auth');

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

function signToken(doctor) {
  return jwt.sign(
    { id: doctor.id, email: doctor.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// ──────────────────────────────────────────────────────────
// POST /auth/login — Email + password login
// ──────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const doctor = findByEmail(email);
  if (!doctor) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Google-only accounts have no password hash
  if (!doctor.passwordHash) {
    return res
      .status(401)
      .json({ error: 'This account uses Google sign-in. Please log in with Google.' });
  }

  const isMatch = bcrypt.compareSync(password, doctor.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = signToken(doctor);
  res
    .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
    .json({ message: 'Login successful', user: sanitize(doctor) });
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
    const token = signToken(req.user);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    res
      .cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      .redirect(`${clientUrl}?auth=success`);
  }
);

// ──────────────────────────────────────────────────────────
// GET /auth/me — Return the currently authenticated user
// ──────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ──────────────────────────────────────────────────────────
// POST /auth/logout — Clear the JWT cookie
// ──────────────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
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
