import React, { useEffect, useMemo, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function coerceLatLng(value) {
  const lat = value?.lat;
  const lng = value?.lng;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
  return { lat, lng };
}

function getShopLocationFromEnv() {
  const latRaw = import.meta.env.VITE_SHOP_LAT;
  const lngRaw = import.meta.env.VITE_SHOP_LNG;
  const lat = typeof latRaw === 'string' ? Number(latRaw) : Number(latRaw);
  const lng = typeof lngRaw === 'string' ? Number(lngRaw) : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function LocationPickerMap({ value, onChange, height = 260 }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const googleRef = useRef(null);

  const initialCenter = useMemo(() => {
    return (
      coerceLatLng(value) ||
      getShopLocationFromEnv() ||
      {
        // Fallback: central-ish India
        lat: 23.2599,
        lng: 77.4126,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let disposed = false;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: [],
    });

    (async () => {
      try {
        const google = await loader.load();
        if (disposed) return;
        googleRef.current = google;

        if (!mapDivRef.current) return;
        if (mapRef.current) return;

        const map = new google.maps.Map(mapDivRef.current, {
          center: initialCenter,
          zoom: 16,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        const marker = new google.maps.Marker({
          map,
          position: initialCenter,
          draggable: true,
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const next = { lat: pos.lat(), lng: pos.lng() };
          onChange?.(next);
        });

        map.addListener('click', (e) => {
          const lat = e?.latLng?.lat?.();
          const lng = e?.latLng?.lng?.();
          if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;
          const next = { lat, lng };
          marker.setPosition(next);
          onChange?.(next);
        });

        mapRef.current = map;
        markerRef.current = marker;

        // If a value is already provided, snap to it.
        const v = coerceLatLng(value);
        if (v) {
          marker.setPosition(v);
          map.setCenter(v);
        }
      } catch {
        // no-op (Checkout will still work without the picker)
      }
    })();

    return () => {
      disposed = true;
      try {
        markerRef.current?.setMap(null);
      } catch {}
      markerRef.current = null;
      mapRef.current = null;
      googleRef.current = null;
    };
  }, [initialCenter, onChange]);

  useEffect(() => {
    const v = coerceLatLng(value);
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!v || !marker || !map) return;

    marker.setPosition(v);
    map.panTo(v);
  }, [value]);

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-white">
      <div ref={mapDivRef} style={{ height, width: '100%' }} />
      <div className="px-3 py-2 text-xs text-gray-600 border-t">
        Tip: drag the pin or tap on the map.
      </div>
    </div>
  );
}
