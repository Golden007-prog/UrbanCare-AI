const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateByGoogle } = require('../data/doctors');

// ──────────────────────────────────────────────────────────
// Passport — Google OAuth 2.0 Strategy
// ──────────────────────────────────────────────────────────

function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        scope: ['profile', 'email'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const doctor = findOrCreateByGoogle(profile);
          return done(null, doctor);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Serialize / deserialize are not strictly needed when using JWT
  // sessions instead of Passport sessions, but we keep them for
  // compatibility if express-session is added later.
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const { findById } = require('../data/doctors');
    const doctor = findById(id);
    done(null, doctor);
  });
}

module.exports = configurePassport;
