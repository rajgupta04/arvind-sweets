import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './deliveryBoyMarker.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icon paths in bundlers.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

function getStatusText(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return '—';
  if (distanceMeters <= 200) return 'Arriving';
  if (distanceMeters <= 1000) return 'Nearby';
  return 'Picked up';
}

function normalizeHeadingDeg(deg) {
  if (!Number.isFinite(deg)) return 0;
  let v = deg % 360;
  if (v < 0) v += 360;
  return v;
}

function shortestAngleDelta(fromDeg, toDeg) {
  const a = normalizeHeadingDeg(fromDeg);
  const b = normalizeHeadingDeg(toDeg);
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function bikeRiderSvgHtml() {
  // HTML string for DivIcon. Keep it self-contained and lightweight.
  return `
    <div class="delivery-marker delivery-marker--stopped" style="--heading: 0deg">
      <div class="delivery-marker__pulse"></div>
      <div class="delivery-marker__body">
        <div class="delivery-marker__rotate">
          <svg class="delivery-marker__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
            <circle class="marker-bg" cx="22" cy="22" r="20" />
            <!-- wheels -->
            <circle cx="14.5" cy="27.2" r="4.1" fill="none" stroke="#ffffff" stroke-width="2" />
            <circle cx="29.7" cy="27.2" r="4.1" fill="none" stroke="#ffffff" stroke-width="2" />
            <!-- frame -->
            <path d="M18 18h6l3.2 6.6h-7.2l-2.2 3.4" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 18l-2 6.6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            <path d="M28 18h3" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            <!-- rider -->
            <circle cx="19.2" cy="14.8" r="2.3" fill="#ffffff" />
            <path d="M19.2 17.2l2.3 2.1 2.4 0.6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.2 19.2l-1.6 3.7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </div>
  `.trim();
}

function makeDeliveryBoyDivIcon() {
  return L.divIcon({
    className: 'delivery-boy-div-icon',
    html: bikeRiderSvgHtml(),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function MapEffects({ deliveryPos, customerPos, followDelivery }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!deliveryPos || !customerPos) return;
    if (fittedRef.current) return;

    const bounds = L.latLngBounds([
      [deliveryPos.lat, deliveryPos.lng],
      [customerPos.lat, customerPos.lng],
    ]);

    map.fitBounds(bounds.pad(0.25), { animate: true });
    fittedRef.current = true;
  }, [map, deliveryPos, customerPos]);

  useEffect(() => {
    if (!followDelivery) return;
    if (!deliveryPos) return;
    if (!fittedRef.current) return;

    map.panTo([deliveryPos.lat, deliveryPos.lng], { animate: true });
  }, [map, deliveryPos, followDelivery]);

  return null;
}

export default function LiveTrackingMap({
  delivery,
  customer,
  followDelivery = true,
}) {
  const deliveryPos = useMemo(() => {
    if (!delivery || typeof delivery.lat !== 'number' || typeof delivery.lng !== 'number') return null;
    return { lat: delivery.lat, lng: delivery.lng };
  }, [delivery]);

  const customerPos = useMemo(() => {
    if (!customer || typeof customer.lat !== 'number' || typeof customer.lng !== 'number') return null;
    return { lat: customer.lat, lng: customer.lng };
  }, [customer]);

  const [animatedDeliveryPos, setAnimatedDeliveryPos] = useState(deliveryPos);
  const animFrameRef = useRef(null);
  const animStartRef = useRef(null);
  const animFromRef = useRef(null);
  const animToRef = useRef(null);
  const deliveryBoyIcon = useMemo(() => makeDeliveryBoyDivIcon(), []);
  const deliveryMarkerRef = useRef(null);

  const [animatedHeading, setAnimatedHeading] = useState(0);
  const headingAnimRef = useRef(null);
  const headingFromRef = useRef(0);
  const headingToRef = useRef(0);
  const headingStartRef = useRef(null);

  const lastTargetRef = useRef(null);
  const lastTargetTimeRef = useRef(null);
  const derivedSpeedRef = useRef(null);

  useEffect(() => {
    if (!deliveryPos) return;
    if (!animatedDeliveryPos) {
      setAnimatedDeliveryPos(deliveryPos);
      return;
    }

    const prevTarget = lastTargetRef.current;
    const now = Date.now();

    if (prevTarget && lastTargetTimeRef.current) {
      const dtS = Math.max(0.001, (now - lastTargetTimeRef.current) / 1000);
      const distM = haversineMeters(prevTarget, deliveryPos);
      derivedSpeedRef.current = distM / dtS;
    }

    lastTargetRef.current = deliveryPos;
    lastTargetTimeRef.current = now;

    // Smoothly animate from current displayed position to new target.
    const DURATION_MS = 900;
    animFromRef.current = animatedDeliveryPos;
    animToRef.current = deliveryPos;
    animStartRef.current = performance.now();

    const step = (t) => {
      const start = animStartRef.current;
      const from = animFromRef.current;
      const to = animToRef.current;
      if (!start || !from || !to) return;

      const p = Math.min(1, (t - start) / DURATION_MS);
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const lat = from.lat + (to.lat - from.lat) * ease;
      const lng = from.lng + (to.lng - from.lng) * ease;
      setAnimatedDeliveryPos({ lat, lng });

      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    try {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } catch {}

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      try {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      } catch {}
      animFrameRef.current = null;
    };
  }, [deliveryPos?.lat, deliveryPos?.lng]);

  const center = useMemo(() => {
    if (animatedDeliveryPos) return [animatedDeliveryPos.lat, animatedDeliveryPos.lng];
    if (customerPos) return [customerPos.lat, customerPos.lng];
    return null;
  }, [animatedDeliveryPos, customerPos]);

  const distanceMeters = useMemo(() => {
    if (!animatedDeliveryPos || !customerPos) return null;
    return haversineMeters(animatedDeliveryPos, customerPos);
  }, [animatedDeliveryPos, customerPos]);

  const speedMps = useMemo(() => {
    const s = delivery?.speed;
    if (typeof s === 'number' && Number.isFinite(s) && s > 0) return s;
    const derived = derivedSpeedRef.current;
    if (typeof derived === 'number' && Number.isFinite(derived) && derived > 0) return derived;
    return null;
  }, [delivery?.speed, deliveryPos?.lat, deliveryPos?.lng]);

  const headingDeg = useMemo(() => {
    const h = delivery?.heading;
    if (typeof h === 'number' && Number.isFinite(h)) return normalizeHeadingDeg(h);
    return 0;
  }, [delivery?.heading]);

  const isMoving = useMemo(() => {
    if (!Number.isFinite(speedMps) || !speedMps) return false;
    return speedMps >= 0.8;
  }, [speedMps]);

  const etaSeconds = useMemo(() => {
    if (!distanceMeters || !speedMps) return null;
    return distanceMeters / speedMps;
  }, [distanceMeters, speedMps]);

  // Smooth heading transitions (wrap-aware) with requestAnimationFrame.
  useEffect(() => {
    const DURATION_MS = 250;

    const from = animatedHeading;
    const delta = shortestAngleDelta(from, headingDeg);
    const to = from + delta;

    headingFromRef.current = from;
    headingToRef.current = to;
    headingStartRef.current = performance.now();

    const step = (t) => {
      const start = headingStartRef.current;
      if (start == null) return;
      const p = Math.min(1, (t - start) / DURATION_MS);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);
      const v = headingFromRef.current + (headingToRef.current - headingFromRef.current) * ease;
      setAnimatedHeading(v);
      if (p < 1) {
        headingAnimRef.current = requestAnimationFrame(step);
      }
    };

    try {
      if (headingAnimRef.current) cancelAnimationFrame(headingAnimRef.current);
    } catch {}

    headingAnimRef.current = requestAnimationFrame(step);

    return () => {
      try {
        if (headingAnimRef.current) cancelAnimationFrame(headingAnimRef.current);
      } catch {}
      headingAnimRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingDeg]);

  // Apply moving/stopped state + heading rotation to the marker DOM for smooth CSS transitions.
  useEffect(() => {
    const marker = deliveryMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement?.();
    if (!el) return;
    const root = el.querySelector?.('.delivery-marker');
    if (!root) return;

    root.style.setProperty('--heading', `${normalizeHeadingDeg(animatedHeading)}deg`);
    root.classList.toggle('delivery-marker--moving', Boolean(isMoving));
    root.classList.toggle('delivery-marker--stopped', !isMoving);
  }, [animatedHeading, isMoving]);

  if (!center) return null;

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border relative">
      <div className="absolute z-[500] top-3 left-3 bg-white/95 backdrop-blur rounded-lg border px-3 py-2 text-xs text-gray-800 space-y-1">
        <div className="font-semibold">Live Tracking</div>
        <div>ETA: {etaSeconds ? formatEta(etaSeconds) : '—'}</div>
        <div>Status: {distanceMeters != null ? getStatusText(distanceMeters) : '—'}</div>
      </div>

      <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEffects deliveryPos={deliveryPos} customerPos={customerPos} followDelivery={followDelivery} />

        {customerPos && (
          <CircleMarker
            center={[customerPos.lat, customerPos.lng]}
            radius={8}
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9 }}
          />
        )}

        {animatedDeliveryPos && (
          <Marker
            position={[animatedDeliveryPos.lat, animatedDeliveryPos.lng]}
            icon={deliveryBoyIcon}
            ref={deliveryMarkerRef}
          />
        )}

        {animatedDeliveryPos && customerPos && (
          <Polyline
            positions={[
              [animatedDeliveryPos.lat, animatedDeliveryPos.lng],
              [customerPos.lat, customerPos.lng],
            ]}
            pathOptions={{ color: '#111827', weight: 4, opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
