import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

export const configurePassport = () => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    console.warn(
      'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL'
    );
    return;
  }

  const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, params, profile, done) => {
        try {
          const idToken = params?.id_token;
          if (!idToken) {
            return done(new Error('Missing Google id_token (ensure scope includes "openid")'));
          }

          const ticket = await oauthClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
          });

          const payload = ticket.getPayload();
          const email = payload?.email?.toLowerCase();
          const emailVerified = payload?.email_verified;
          const googleId = payload?.sub;

          if (!email || !googleId) {
            return done(new Error('Google token missing required claims'));
          }

          if (!emailVerified) {
            return done(new Error('Google email is not verified'));
          }

          const profileEmail = profile?.emails?.[0]?.value?.toLowerCase();
          if (profileEmail && profileEmail !== email) {
            return done(new Error('Google email mismatch'));
          }

          let user = await User.findOne({ email });

          if (user) {
            if (user.googleId && user.googleId !== googleId) {
              return done(new Error('Google account mismatch for this email'));
            }

            if (!user.googleId) user.googleId = googleId;
            if (!user.isGoogleUser) user.isGoogleUser = true;
            if (user.isModified('googleId') || user.isModified('isGoogleUser')) {
              await user.save();
            }

            return done(null, user);
          }

          const displayName = payload?.name || profile?.displayName || email.split('@')[0];

          user = await User.create({
            name: displayName,
            email,
            googleId,
            isGoogleUser: true,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};
