import React, { createContext, useEffect, useMemo, useState } from 'react';
import { getPublicSettings } from '../services/settingsService';

export const PublicSettingsContext = createContext({
  publicSettings: null,
  publicSettingsLoaded: false,
});

export function PublicSettingsProvider({ children }) {
  const [publicSettings, setPublicSettings] = useState(null);
  const [publicSettingsLoaded, setPublicSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const s = await getPublicSettings();
        if (!cancelled) setPublicSettings(s || null);
      } catch {
        if (!cancelled) setPublicSettings(null);
      } finally {
        if (!cancelled) setPublicSettingsLoaded(true);
      }
    };

    fetch();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({
    publicSettings,
    publicSettingsLoaded,
  }), [publicSettings, publicSettingsLoaded]);

  return (
    <PublicSettingsContext.Provider value={value}>
      {children}
    </PublicSettingsContext.Provider>
  );
}
