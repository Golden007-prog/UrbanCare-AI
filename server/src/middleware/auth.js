const jwt = require('jsonwebtoken');
const { findById, sanitize } = require('../data/doctors');

// ──────────────────────────────────────────────────────────
// requireAuth — Protect routes behind JWT verification
// ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  // 1. Read JWT from the HTTP-only cookie
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    // 2. Verify & decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user to the request
    const doctor = findById(decoded.id);
    if (!doctor) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = sanitize(doctor);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = requireAuth;
