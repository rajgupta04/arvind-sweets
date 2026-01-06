// Expo dynamic config.
// This lets us inject secrets/keys from env vars for native modules (e.g., Google Maps key).
// Note: Only EXPO_PUBLIC_* vars are available in JS at runtime; but config runs at build time.

import 'dotenv/config';

export default ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    ios: {
      ...config.ios,
      // Enables Google Maps SDK on iOS for react-native-maps (when using provider={PROVIDER_GOOGLE}).
      // On iOS, Apple Maps is the default; this key is required if you switch to Google.
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey || config.ios?.config?.googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: googleMapsApiKey
          ? { apiKey: googleMapsApiKey }
          : (config.android?.config?.googleMaps || undefined),
      },
    },
  };
};
