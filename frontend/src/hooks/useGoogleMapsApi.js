import { useEffect, useMemo, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let loadPromise = null;
let cachedError = null;

function getApiKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
}

export function loadGoogleMapsApi() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Missing VITE_GOOGLE_MAPS_API_KEY');
    cachedError = err;
    return Promise.reject(err);
  }

  if (cachedError) return Promise.reject(cachedError);

  if (!loadPromise) {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
    });

    loadPromise = loader
      .load()
      .then((google) => google)
      .catch((err) => {
        cachedError = err;
        loadPromise = null;
        throw err;
      });
  }

  return loadPromise;
}

export function resetGoogleMapsApiLoader() {
  loadPromise = null;
  cachedError = null;
}

export function useGoogleMapsApi(reloadKey = 0) {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.google?.maps));
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setError(null);

    if (window.google?.maps) {
      setIsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setIsLoaded(false);

    loadGoogleMapsApi()
      .then(() => {
        if (cancelled) return;
        setIsLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const google = useMemo(() => (isLoaded ? window.google : null), [isLoaded]);

  return { google, isLoaded, error };
}
