// ──────────────────────────────────────────────────────────
// hospitalIsolationMiddleware — Multi-Hospital Data Isolation
// ──────────────────────────────────────────────────────────

/**
 * Injects req.hospitalID from the authenticated user.
 * All downstream queries should filter by this value
 * to enforce multi-tenant hospital isolation.
 *
 * Admin users can optionally override via query param ?hospitalID=...
 */
function hospitalIsolation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Admins can override hospital scope via query parameter
  if (req.user.role === 'admin' && req.query.hospitalID) {
    req.hospitalID = req.query.hospitalID;
  } else {
    req.hospitalID = req.user.hospitalID;
  }

  if (!req.hospitalID) {
    return res.status(400).json({ error: 'No hospital associated with this user.' });
  }

  next();
}

module.exports = hospitalIsolation;
