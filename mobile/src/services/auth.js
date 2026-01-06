import { api } from './api';

// Backend contract (as provided):
// POST /auth/login
// POST /auth/google
// GET  /auth/profile

export async function loginWithEmailPassword({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  // Expecting { token, user? } or similar.
  return res.data;
}

export async function loginWithGoogle({ idToken, accessToken }) {
  // Important: Your backend decides which token it expects.
  // Common patterns:
  // - { idToken }
  // - { accessToken }
  // Keep both to avoid mobile/backend mismatch.
  const res = await api.post('/auth/google', { idToken, accessToken });
  return res.data;
}

export async function fetchMyProfile() {
  const res = await api.get('/auth/profile');
  return res.data;
}
