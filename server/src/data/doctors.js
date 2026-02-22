const bcrypt = require('bcryptjs');

// ──────────────────────────────────────────────────────────
// Mock Doctor Database
// In production, replace with a real database (PostgreSQL, MongoDB, etc.)
// ──────────────────────────────────────────────────────────

// Pre-hash passwords so bcrypt.compareSync works at login time
const doctors = [
  {
    id: '1',
    name: 'Dr. Ayesha Smith',
    email: 'dr.smith@urbancare.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    specialty: 'Cardiology',
    googleId: null,
  },
  {
    id: '2',
    name: 'Dr. James Patel',
    email: 'dr.patel@urbancare.com',
    passwordHash: bcrypt.hashSync('password456', 10),
    specialty: 'Neurology',
    googleId: null,
  },
];

// ── Helpers ────────────────────────────────────────────────

function findByEmail(email) {
  return doctors.find((d) => d.email === email) || null;
}

function findById(id) {
  return doctors.find((d) => d.id === id) || null;
}

function findByGoogleId(googleId) {
  return doctors.find((d) => d.googleId === googleId) || null;
}

/**
 * Find an existing doctor by Google ID or email, or create a new one
 * from the Google profile if none exists.
 */
function findOrCreateByGoogle(profile) {
  // 1. Try matching by googleId
  let doctor = findByGoogleId(profile.id);
  if (doctor) return doctor;

  // 2. Try matching by email (link account)
  const email =
    profile.emails && profile.emails.length > 0
      ? profile.emails[0].value
      : null;

  if (email) {
    doctor = findByEmail(email);
    if (doctor) {
      doctor.googleId = profile.id; // link Google ID to existing account
      return doctor;
    }
  }

  // 3. Create a brand-new doctor entry
  const newDoctor = {
    id: String(doctors.length + 1),
    name: profile.displayName || 'Doctor',
    email: email || `google_${profile.id}@urbancare.com`,
    passwordHash: null, // Google-only account, no password
    specialty: 'General Medicine',
    googleId: profile.id,
  };

  doctors.push(newDoctor);
  return newDoctor;
}

/**
 * Return a safe representation of the doctor (no password hash).
 */
function sanitize(doctor) {
  if (!doctor) return null;
  const { passwordHash, ...safe } = doctor;
  return safe;
}

module.exports = {
  doctors,
  findByEmail,
  findById,
  findByGoogleId,
  findOrCreateByGoogle,
  sanitize,
};
