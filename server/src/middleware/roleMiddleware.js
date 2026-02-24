// ──────────────────────────────────────────────────────────
// roleMiddleware — Role-Based Access Control
// ──────────────────────────────────────────────────────────

/**
 * Returns middleware that allows only requests from users
 * whose role is in the allowed list.
 *
 * Usage:
 *   router.post('/patients', requireAuth, requireRole('doctor', 'admin'), handler);
 *
 * @param  {...string} roles  — Allowed roles (e.g. 'doctor', 'admin', 'family')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = requireRole;
