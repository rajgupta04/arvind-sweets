import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resetGoogleMapsApiLoader, useGoogleMapsApi } from '../hooks/useGoogleMapsApi';

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

function formatKm(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '—';
  const km = distanceMeters / 1000;
  if (km < 1) return `${Math.round(distanceMeters)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

function formatCoord(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(7);
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

function svgToDataUrl(svg) {
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, '')
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/')
    .replace(/%22/g, "'");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

function getShopLocationFromEnv() {
  const latRaw = import.meta.env.VITE_SHOP_LAT;
  const lngRaw = import.meta.env.VITE_SHOP_LNG;
  const lat = typeof latRaw === 'string' ? Number(latRaw) : Number(latRaw);
  const lng = typeof lngRaw === 'string' ? Number(lngRaw) : Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function easeInOutQuad(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export default function LiveTrackingMap({
  delivery,
  customer,
  followDelivery = true,
}) {
  const [retryNonce, setRetryNonce] = useState(0);
  const { google, isLoaded, error } = useGoogleMapsApi(retryNonce);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const shopMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const lastRouteRequestAtRef = useRef(0);
  const lastRouteEndpointsRef = useRef(null);
  const pendingRouteEndpointsRef = useRef(null);
  const routeTimerRef = useRef(null);
  const lastDeliveryPosRef = useRef(null);
  const deliveryAnimFrameRef = useRef(null);
  const fitTimerRef = useRef(null);

  const iconsRef = useRef(null);

  const deliveryPos = useMemo(() => {
    if (!delivery || typeof delivery.lat !== 'number' || typeof delivery.lng !== 'number') return null;
    return { lat: delivery.lat, lng: delivery.lng };
  }, [delivery]);

  const customerPos = useMemo(() => {
    if (!customer || typeof customer.lat !== 'number' || typeof customer.lng !== 'number') return null;
    return { lat: customer.lat, lng: customer.lng };
  }, [customer]);

  const shopPos = useMemo(() => getShopLocationFromEnv(), []);

  const lastTargetRef = useRef(null);
  const lastTargetTimeRef = useRef(null);
  const derivedSpeedRef = useRef(null);

  const [uiDeliveryPos, setUiDeliveryPos] = useState(deliveryPos);
  const [uiHeading, setUiHeading] = useState(0);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState(null);
  const [routeEtaSeconds, setRouteEtaSeconds] = useState(null);
  const headingAnimRef = useRef(null);
  const headingFromRef = useRef(0);
  const headingToRef = useRef(0);
  const headingStartRef = useRef(null);

  useEffect(() => {
    if (!deliveryPos) return;

    const prevTarget = lastTargetRef.current;
    const now = Date.now();

    if (prevTarget && lastTargetTimeRef.current) {
      const dtS = Math.max(0.001, (now - lastTargetTimeRef.current) / 1000);
      const distM = haversineMeters(prevTarget, deliveryPos);
      derivedSpeedRef.current = distM / dtS;
    }

    lastTargetRef.current = deliveryPos;
    lastTargetTimeRef.current = now;
  }, [deliveryPos?.lat, deliveryPos?.lng]);

  const center = useMemo(() => {
    if (deliveryPos) return { lat: deliveryPos.lat, lng: deliveryPos.lng };
    if (customerPos) return { lat: customerPos.lat, lng: customerPos.lng };
    if (shopPos) return { lat: shopPos.lat, lng: shopPos.lng };
    return null;
  }, [deliveryPos, customerPos, shopPos]);

  const distanceMeters = useMemo(() => {
    if (Number.isFinite(routeDistanceMeters) && routeDistanceMeters > 0) return routeDistanceMeters;
    if (!deliveryPos || !customerPos) return null;
    return haversineMeters(deliveryPos, customerPos);
  }, [routeDistanceMeters, deliveryPos, customerPos]);

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
    if (Number.isFinite(routeEtaSeconds) && routeEtaSeconds > 0) return routeEtaSeconds;
    if (!distanceMeters || !speedMps) return null;
    return distanceMeters / speedMps;
  }, [routeEtaSeconds, distanceMeters, speedMps]);

  // Smooth heading transitions (wrap-aware) with requestAnimationFrame.
  useEffect(() => {
    const DURATION_MS = 250;

    const from = uiHeading;
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
      setUiHeading(v);
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

  const openInGoogleMapsUrl = useMemo(() => {
    if (!deliveryPos || !customerPos) return null;
    const origin = `${deliveryPos.lat},${deliveryPos.lng}`;
    const dest = `${customerPos.lat},${customerPos.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }, [deliveryPos, customerPos]);

  useEffect(() => {
    if (!deliveryPos) return;
    setUiDeliveryPos(deliveryPos);
  }, [deliveryPos?.lat, deliveryPos?.lng]);

  useEffect(() => {
    if (!isLoaded || !google) return;
    if (!containerRef.current) return;
    if (!center) return;
    if (mapRef.current) return;

    const map = new google.maps.Map(containerRef.current, {
      center,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
    });

    mapRef.current = map;

    try {
      directionsServiceRef.current = new google.maps.DirectionsService();
    } catch {
      directionsServiceRef.current = null;
    }

    const bikeSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="#111827" />
        <circle cx="14.5" cy="27.2" r="4.1" fill="none" stroke="#ffffff" stroke-width="2" />
        <circle cx="29.7" cy="27.2" r="4.1" fill="none" stroke="#ffffff" stroke-width="2" />
        <path d="M18 18h6l3.2 6.6h-7.2l-2.2 3.4" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 18l-2 6.6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <path d="M28 18h3" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="19.2" cy="14.8" r="2.3" fill="#ffffff" />
        <path d="M19.2 17.2l2.3 2.1 2.4 0.6" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20.2 19.2l-1.6 3.7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      </svg>
    `.trim();

    const homeSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
        <path fill="#2563eb" d="M12 3l9 8h-3v10h-5v-6H11v6H6V11H3z"/>
      </svg>
    `.trim();

    const storeSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
        <path fill="#f97316" d="M4 4h16l-1 5H5L4 4zm1 7h14v9H5v-9zm3 2v5h2v-5H8zm6 0v5h2v-5h-2z"/>
      </svg>
    `.trim();

    iconsRef.current = {
      delivery: {
        url: svgToDataUrl(bikeSvg),
        size: { w: 44, h: 44 },
        anchor: { x: 22, y: 22 },
      },
      customer: {
        url: svgToDataUrl(homeSvg),
        size: { w: 40, h: 40 },
        anchor: { x: 20, y: 36 },
      },
      shop: {
        url: svgToDataUrl(storeSvg),
        size: { w: 40, h: 40 },
        anchor: { x: 20, y: 36 },
      },
    };

    polylineRef.current = new google.maps.Polyline({
      map,
      geodesic: true,
      strokeColor: '#111827',
      strokeOpacity: 0.7,
      strokeWeight: 4,
    });
  }, [google, isLoaded, center, retryNonce]);

  useEffect(() => {
    return () => {
      try {
        if (deliveryAnimFrameRef.current) cancelAnimationFrame(deliveryAnimFrameRef.current);
      } catch {}
      deliveryAnimFrameRef.current = null;
      try {
        if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
      } catch {}
      fitTimerRef.current = null;
      try {
        if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      } catch {}
      routeTimerRef.current = null;
    };
  }, []);

  const requestRoute = (origin, destination) => {
    const map = mapRef.current;
    const directionsService = directionsServiceRef.current;
    const polyline = polylineRef.current;

    if (!map || !polyline || !origin || !destination) return;

    const applyFallback = () => {
      try {
        polyline.setPath([origin, destination]);
      } catch {}
      setRouteDistanceMeters(null);
      setRouteEtaSeconds(null);
    };

    if (!directionsService) {
      applyFallback();
      return;
    }

    const last = lastRouteEndpointsRef.current;
    const movedEnough =
      !last ||
      haversineMeters(last.origin, origin) > 30 ||
      haversineMeters(last.destination, destination) > 30;

    // Avoid hammering Directions API on frequent GPS updates.
    const MIN_INTERVAL_MS = 12000;
    const now = Date.now();
    const since = now - (lastRouteRequestAtRef.current || 0);

    pendingRouteEndpointsRef.current = { origin, destination };

    if (!movedEnough) return;

    if (since < MIN_INTERVAL_MS) {
      const wait = MIN_INTERVAL_MS - since;
      try {
        if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
      } catch {}
      routeTimerRef.current = setTimeout(() => {
        const pending = pendingRouteEndpointsRef.current;
        if (!pending) return;
        requestRoute(pending.origin, pending.destination);
      }, wait);
      return;
    }

    lastRouteRequestAtRef.current = now;
    lastRouteEndpointsRef.current = { origin, destination };

    try {
      directionsService.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status !== 'OK' || !result?.routes?.length) {
            applyFallback();
            return;
          }

          const route = result.routes[0];
          const path = route.overview_path;
          if (Array.isArray(path) && path.length) {
            try {
              polyline.setPath(path);
            } catch {
              applyFallback();
            }
          } else {
            applyFallback();
          }

          const leg = route.legs?.[0];
          const dist = leg?.distance?.value;
          const dur = leg?.duration?.value;
          setRouteDistanceMeters(typeof dist === 'number' && Number.isFinite(dist) ? dist : null);
          setRouteEtaSeconds(typeof dur === 'number' && Number.isFinite(dur) ? dur : null);
        }
      );
    } catch {
      applyFallback();
    }
  };

  useEffect(() => {
    if (!isLoaded || !google) return;
    if (!mapRef.current) return;

    const map = mapRef.current;
    const icons = iconsRef.current;

    const ensureMarker = (ref, pos, iconKey) => {
      if (!pos) {
        if (ref.current) {
          ref.current.setMap(null);
          ref.current = null;
        }
        return;
      }

      if (!ref.current) {
        const iconDef = icons?.[iconKey];
        ref.current = new google.maps.Marker({
          position: pos,
          map,
          icon: iconDef
            ? {
                url: iconDef.url,
                scaledSize: new google.maps.Size(iconDef.size.w, iconDef.size.h),
                anchor: new google.maps.Point(iconDef.anchor.x, iconDef.anchor.y),
              }
            : undefined,
          optimized: true,
        });
      } else {
        ref.current.setPosition(pos);
      }
    };

    ensureMarker(shopMarkerRef, shopPos, 'shop');
    ensureMarker(customerMarkerRef, customerPos, 'customer');

    // Delivery marker: smooth animation between updates.
    if (!deliveryPos) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setMap(null);
        deliveryMarkerRef.current = null;
      }
      lastDeliveryPosRef.current = null;
    } else {
      if (!deliveryMarkerRef.current) {
        ensureMarker(deliveryMarkerRef, deliveryPos, 'delivery');
        lastDeliveryPosRef.current = deliveryPos;
        setUiDeliveryPos(deliveryPos);
      } else {
        const from = lastDeliveryPosRef.current || deliveryPos;
        const to = deliveryPos;
        lastDeliveryPosRef.current = to;

        const DURATION_MS = 900;
        const start = performance.now();

        try {
          if (deliveryAnimFrameRef.current) cancelAnimationFrame(deliveryAnimFrameRef.current);
        } catch {}

        const step = (t) => {
          const p = Math.min(1, (t - start) / DURATION_MS);
          const e = easeInOutQuad(p);
          const lat = from.lat + (to.lat - from.lat) * e;
          const lng = from.lng + (to.lng - from.lng) * e;
          const pos = { lat, lng };

          deliveryMarkerRef.current?.setPosition(pos);

          if (p < 1) {
            deliveryAnimFrameRef.current = requestAnimationFrame(step);
          }
        };

        deliveryAnimFrameRef.current = requestAnimationFrame(step);
      }
    }

    // Route polyline: road-following route (Directions). Fallbacks to straight line.
    const origin = deliveryPos || shopPos;
    const destination = customerPos;
    if (origin && destination) {
      requestRoute(origin, destination);
    } else {
      polylineRef.current?.setPath([]);
      setRouteDistanceMeters(null);
      setRouteEtaSeconds(null);
    }

    // Follow delivery (pan) without re-fitting constantly.
    if (followDelivery && deliveryPos) {
      map.panTo(deliveryPos);
    }

    // Fit bounds when markers change; avoid jitter on frequent delivery updates.
    try {
      if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
    } catch {}

    fitTimerRef.current = setTimeout(() => {
      const pts = [shopPos, deliveryPos, customerPos].filter(Boolean);
      if (!pts.length) return;

      const bounds = new google.maps.LatLngBounds();
      pts.forEach((p) => bounds.extend(p));

      const current = map.getBounds?.();
      if (current && deliveryPos && current.contains(deliveryPos)) {
        // Only re-fit if a static marker changed or if delivery escaped the viewport.
        if (!current.contains(customerPos || deliveryPos) || !current.contains(shopPos || deliveryPos)) {
          map.fitBounds(bounds, 64);
        }
        return;
      }

      map.fitBounds(bounds, 64);
    }, 180);
  }, [google, isLoaded, shopPos, customerPos?.lat, customerPos?.lng, deliveryPos?.lat, deliveryPos?.lng, followDelivery, retryNonce]);

  if (!center) return null;

  if (error) {
    return (
      <div className="w-full h-80 rounded-xl overflow-hidden border relative flex items-center justify-center bg-gray-50">
        <div className="px-4 text-center space-y-2">
          <div className="font-semibold text-gray-900">Map failed to load</div>
          <div className="text-sm text-gray-600">{String(error?.message || error)}</div>
          <button
            type="button"
            onClick={() => {
              resetGoogleMapsApiLoader();
              setRetryNonce((n) => n + 1);
            }}
            className="inline-flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-80 rounded-xl overflow-hidden border relative flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-600">Loading map…</div>
      </div>
    );
  }

  const canCenterOnDelivery = Boolean(mapRef.current && uiDeliveryPos && typeof uiDeliveryPos.lat === 'number' && typeof uiDeliveryPos.lng === 'number');
  const centerOnDelivery = () => {
    const map = mapRef.current;
    const pos = uiDeliveryPos;
    if (!map || !pos) return;

    const accuracy = typeof delivery?.accuracy === 'number' && Number.isFinite(delivery.accuracy) ? delivery.accuracy : null;
    const targetZoom = accuracy != null ? (accuracy <= 20 ? 18 : accuracy <= 80 ? 17 : 16) : 17;

    try {
      map.panTo(pos);
    } catch {
      try {
        map.setCenter(pos);
      } catch {}
    }

    try {
      map.setZoom(targetZoom);
    } catch {}
  };

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border relative">
      <div className="absolute z-[2] top-3 left-3 bg-white/95 backdrop-blur rounded-lg border px-3 py-2 text-xs text-gray-800 space-y-1">
        <div className="font-semibold">Live Tracking</div>
        <div>ETA: {etaSeconds ? formatEta(etaSeconds) : '—'}</div>
        <div>KM left: {distanceMeters != null ? formatKm(distanceMeters) : '—'}</div>
        <div>Status: {distanceMeters != null ? getStatusText(distanceMeters) : '—'}</div>
        <div>
          Lat/Lng:{' '}
          {uiDeliveryPos ? `${formatCoord(uiDeliveryPos.lat)}, ${formatCoord(uiDeliveryPos.lng)}` : '—'}
        </div>
        {openInGoogleMapsUrl && (
          <a
            href={openInGoogleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border bg-white px-2 py-1 text-xs text-gray-900 hover:bg-gray-50"
          >
            Open in Google Maps
          </a>
        )}

        <button
          type="button"
          onClick={centerOnDelivery}
          disabled={!canCenterOnDelivery}
          className="inline-flex items-center justify-center rounded-md border bg-white px-2 py-1 text-xs text-gray-900 hover:bg-gray-50 disabled:opacity-60"
          title={canCenterOnDelivery ? 'Center map on current location' : 'Location not available yet'}
        >
          Current location
        </button>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
