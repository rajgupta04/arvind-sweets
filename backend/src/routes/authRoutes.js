import express from 'express';
import passport from 'passport';
import { generateToken } from '../utils/generateToken.js';

const router = express.Router();

const toOrigin = (value) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getAllowedFrontendOrigins = () => {
  const fromSingle = toOrigin(process.env.FRONTEND_URL);
  const fromList = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map(toOrigin)
    .filter(Boolean);

  const all = [fromSingle, ...fromList].filter(Boolean);
  return Array.from(new Set(all));
};

const getDefaultFrontendOrigin = () => {
  return toOrigin(process.env.FRONTEND_URL) || 'http://localhost:5173';
};

const getFrontendOriginFromRequest = (req) => {
  const allowed = getAllowedFrontendOrigins();
  const requested = toOrigin(req.query.redirect);
  if (requested && allowed.includes(requested)) return requested;
  return getDefaultFrontendOrigin();
};

const getFrontendOriginFromState = (req) => {
  const allowed = getAllowedFrontendOrigins();
  const stateOrigin = toOrigin(req.query.state);
  if (stateOrigin && allowed.includes(stateOrigin)) return stateOrigin;
  return getDefaultFrontendOrigin();
};

const ensureGoogleOAuthConfigured = (req, res, next) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    const redirectBase = getFrontendOriginFromRequest(req);
    return res.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(
        'Google OAuth is not configured on the server'
      )}`
    );
  }
  return next();
};

// GET /api/auth/google
router.get(
  '/google',
  ensureGoogleOAuthConfigured,
  (req, res, next) => {
    const redirectBase = getFrontendOriginFromRequest(req);
    return passport.authenticate('google', {
      scope: ['openid', 'profile', 'email'],
      session: false,
      prompt: 'select_account',
      state: redirectBase,
    })(req, res, next);
  }
);

// GET /api/auth/google/callback
router.get('/google/callback', ensureGoogleOAuthConfigured, (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    const redirectBase = getFrontendOriginFromState(req);

    if (err || !user) {
      const message = err?.message || 'Google authentication failed';
      return res.redirect(
        `${redirectBase}/oauth/success?error=${encodeURIComponent(message)}`
      );
    }

    const token = generateToken(user._id);
    return res.redirect(`${redirectBase}/oauth/success?token=${encodeURIComponent(token)}`);
  })(req, res, next);
});

export default router;
