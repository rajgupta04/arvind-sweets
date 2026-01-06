// Centralized env access.
// In Expo, only EXPO_PUBLIC_* variables are available in the JS bundle.

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export function assertRequiredEnv() {
  if (!ENV.API_BASE_URL) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_BASE_URL. Set it in .env (mobile/.env).'
    );
  }
}
