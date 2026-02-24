const jwt = require('jsonwebtoken');
const { findById, sanitize } = require('../models/User');

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

    // 3. Attach user to the request (includes role, hospitalID)
    const user = findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = sanitize(user);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// ──────────────────────────────────────────────────────────
// requireRole — Authorize users by role
// ──────────────────────────────────────────────────────────

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure requireAuth has run first
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]` });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
