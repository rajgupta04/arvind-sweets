import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LiveTrackingMap from '../components/LiveTrackingMap';
import { getOrderDetails } from '../services/orderService';
import { markDelivered, startDelivery } from '../services/deliveryService';
import { createSocket } from '../services/socket';

const EMIT_EVERY_MS = 3000;

function coerceNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function normalizeHeadingDeg(deg) {
  if (!Number.isFinite(deg)) return null;
  let v = deg % 360;
  if (v < 0) v += 360;
  return v;
}

function getCompassHeadingFromEvent(e) {
  // iOS Safari provides webkitCompassHeading (0-360, relative to North)
  const webkitHeading = e?.webkitCompassHeading;
  if (typeof webkitHeading === 'number' && Number.isFinite(webkitHeading)) {
    return normalizeHeadingDeg(webkitHeading);
  }

  // Many browsers provide alpha (0-360). Often it's clockwise degrees from North.
  const alpha = e?.alpha;
  if (typeof alpha === 'number' && Number.isFinite(alpha)) {
    // Common conversion used in web compasses.
    return normalizeHeadingDeg(360 - alpha);
  }

  return null;
}

export default function DeliveryOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState('');

  const [myLocation, setMyLocation] = useState(null);
  const [compassHeading, setCompassHeading] = useState(null);
  const [compassEnabled, setCompassEnabled] = useState(false);

  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const latestFixRef = useRef(null);
  const latestCompassHeadingRef = useRef(null);
  const emitTimerRef = useRef(null);
  const socketReadyRef = useRef(false);

  const customerPos = useMemo(() => {
    const loc = order?.shippingAddress?.location;
    if (!loc) return null;
    const lat = typeof loc.lat === 'string' ? Number(loc.lat) : loc.lat;
    const lng = typeof loc.lng === 'string' ? Number(loc.lng) : loc.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [order]);

  const canEmit = useMemo(() => {
    return Boolean(order?._id && order?.liveTrackingEnabled && order?.orderStatus === 'Out for Delivery');
  }, [order]);

  useEffect(() => {
    return () => {
      try {
        if (emitTimerRef.current) {
          clearInterval(emitTimerRef.current);
          emitTimerRef.current = null;
        }
      } catch {}
      try {
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      } catch {}
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, []);

  const needsCompassPermission = useMemo(() => {
    try {
      return typeof window !== 'undefined' &&
        typeof window.DeviceOrientationEvent !== 'undefined' &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function';
    } catch {
      return false;
    }
  }, []);

  const enableCompass = async () => {
    try {
      if (needsCompassPermission) {
        const res = await window.DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') {
          alert('Compass permission denied');
          return;
        }
      }
      setCompassEnabled(true);
    } catch (e) {
      console.warn('Compass enable failed', e);
      alert('Unable to enable compass on this device/browser');
    }
  };

  useEffect(() => {
    if (!compassEnabled) return;

    const handler = (e) => {
      const heading = getCompassHeadingFromEvent(e);
      if (heading == null) return;
      latestCompassHeadingRef.current = heading;
      setCompassHeading(heading);
    };

    // Prefer absolute if available.
    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };
  }, [compassEnabled]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrderDetails(id);
      setOrder(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ensureSocketConnected = () => {
    if (socketRef.current && socketRef.current.connected) return socketRef.current;

    const socket = createSocket();
    socketRef.current = socket;
    socketReadyRef.current = false;

    socket.on('connect', () => {
      socketReadyRef.current = true;
      if (order?._id) {
        socket.emit('joinOrder', { orderId: order._id }, () => {});
      }
    });

    socket.on('disconnect', () => {
      socketReadyRef.current = false;
    });

    return socket;
  };

  const startEmitLoop = () => {
    if (emitTimerRef.current) return;
    emitTimerRef.current = setInterval(() => {
      if (!canEmit) return;
      const socket = socketRef.current;
      if (!socket || !socket.connected || !socketReadyRef.current) return;
      const fix = latestFixRef.current;
      if (!fix || !order?._id) return;

      socket.emit('delivery:location:update', { orderId: order._id, ...fix }, (ack) => {
        if (ack?.ok) {
          setStatus('Live');
        } else {
          setStatus(`Send blocked: ${ack?.reason || 'unknown'}`);
        }
      });
    }, EMIT_EVERY_MS);
  };

  const startGeoWatch = () => {
    if (!('geolocation' in navigator)) {
      setStatus('Geolocation not supported');
      return;
    }

    if (watchIdRef.current != null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = coerceNumber(pos?.coords?.latitude);
        const lng = coerceNumber(pos?.coords?.longitude);
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const accuracy = coerceNumber(pos?.coords?.accuracy);
        const speed = coerceNumber(pos?.coords?.speed);
        const headingFromGps = coerceNumber(pos?.coords?.heading);
        const timestamp = typeof pos?.timestamp === 'number' ? pos.timestamp : Date.now();

        const heading =
          typeof headingFromGps === 'number'
            ? normalizeHeadingDeg(headingFromGps)
            : latestCompassHeadingRef.current;

        const fix = {
          lat,
          lng,
          accuracy: typeof accuracy === 'number' ? accuracy : undefined,
          speed: typeof speed === 'number' ? speed : undefined,
          heading: typeof heading === 'number' ? heading : undefined,
          timestamp,
        };

        latestFixRef.current = fix;
        setMyLocation({ lat, lng, updatedAt: new Date().toISOString(), heading: typeof heading === 'number' ? heading : undefined });
      },
      (err) => {
        setStatus(`Location error: ${err?.message || err?.code || 'unknown'}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );
  };

  // Auto-start socket + geolocation when tracking is enabled
  useEffect(() => {
    if (!order?._id) return;
    if (!canEmit) return;

    ensureSocketConnected();
    startGeoWatch();
    startEmitLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id, canEmit]);

  const openGoogleMapsNavigation = () => {
    if (!customerPos) {
      alert('Customer location is not available for navigation');
      return;
    }

    const destination = `${customerPos.lat},${customerPos.lng}`;
    const origin = myLocation?.lat && myLocation?.lng ? `${myLocation.lat},${myLocation.lng}` : null;

    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStartDelivery = async () => {
    if (!order?._id) return;
    try {
      setActionLoading(true);
      setStatus('Starting delivery…');
      await startDelivery(order._id);
      await load();
      setStatus('Delivery started');
    } catch (e) {
      setStatus('');
      alert(e?.response?.data?.message || 'Failed to start delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!order?._id) return;
    try {
      setActionLoading(true);
      setStatus('Marking delivered…');
      await markDelivered(order._id);
      await load();
      setStatus('Delivered');
    } catch (e) {
      setStatus('');
      alert(e?.response?.data?.message || 'Failed to mark delivered');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            type="button"
            onClick={() => navigate('/delivery/my-packages')}
            className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order {order?._id}</h1>
            <p className="text-sm text-gray-600">Status: {order?.orderStatus || '—'}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/delivery/my-packages')}
            className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Customer</div>
              <div className="font-semibold text-gray-900">{order?.shippingAddress?.name || order?.user?.name || '—'}</div>
              <div className="text-sm text-gray-700">{order?.shippingAddress?.phone || order?.user?.phone || ''}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Address</div>
              <div className="text-sm text-gray-900">{order?.shippingAddress?.street || '—'}</div>
              <div className="text-sm text-gray-700">
                {order?.shippingAddress?.city || ''}{order?.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}{' '}
                {order?.shippingAddress?.pincode || ''}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStartDelivery}
              disabled={actionLoading || order?.orderStatus === 'Delivered'}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-60"
            >
              Start Delivery
            </button>
            <button
              type="button"
              onClick={handleMarkDelivered}
              disabled={actionLoading || order?.orderStatus === 'Delivered'}
              className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Mark Delivered
            </button>

            <button
              type="button"
              onClick={openGoogleMapsNavigation}
              className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
            >
              Navigate (Google Maps)
            </button>

            {compassEnabled ? (
              <div className="text-sm text-gray-600 flex items-center">
                Compass: {typeof compassHeading === 'number' ? `${Math.round(compassHeading)}°` : '—'}
              </div>
            ) : (
              <button
                type="button"
                onClick={enableCompass}
                className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
              >
                Enable Compass
              </button>
            )}

            {status ? <div className="text-sm text-gray-600 flex items-center">{status}</div> : null}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="text-sm font-semibold text-gray-900">Live Map</div>
            <div className="text-xs text-gray-600">Your location is shared only while tracking is enabled.</div>
          </div>
          <div className="p-4">
            <LiveTrackingMap
              delivery={myLocation}
              customer={customerPos}
              followDelivery={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
