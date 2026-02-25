const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateByGoogle, findById } = require('../models/User');

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
        proxy: true,
        scope: ['profile', 'email'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = findOrCreateByGoogle(profile);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = findById(id);
    done(null, user);
  });
}

module.exports = configurePassport;

