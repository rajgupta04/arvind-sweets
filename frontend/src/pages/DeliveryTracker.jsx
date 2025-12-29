import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createSocket, createSocketForAuthToken } from '../services/socket';

const EMIT_EVERY_MS = 3000;
const MOVING_SPEED_M_S = 0.8;
const STATIONARY_DISTANCE_M = 8;
const STATIONARY_DOWNGRADE_AFTER_MS = 30000;

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

function coerceNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export default function DeliveryTracker() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const deliveryBoyId = params.get('deliveryBoyId') || '';
  const token = params.get('token') || '';

  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [lastCoords, setLastCoords] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const [moving, setMoving] = useState(false);

  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const emitTimerRef = useRef(null);
  const latestFixRef = useRef(null);
  const lastFixForMotionRef = useRef(null);
  const stationarySinceRef = useRef(null);
  const highAccuracyRef = useRef(false);
  const socketAuthedRef = useRef(false);

  const canStart = useMemo(
    () => Boolean(orderId && deliveryBoyId && token),
    [orderId, deliveryBoyId, token]
  );

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
        }
      } catch {}
      try {
        socketRef.current?.disconnect();
      } catch {}
    };
  }, []);

  const isLive = useMemo(() => {
    if (!running || !socketConnected) return false;
    if (!lastSent) return false;
    return Date.now() - lastSent.getTime() <= 10000;
  }, [running, socketConnected, lastSent]);

  const startEmitLoop = () => {
    if (emitTimerRef.current) return;
    emitTimerRef.current = setInterval(() => {
      const socket = socketRef.current;
      const fix = latestFixRef.current;
      if (!socket || !socket.connected) return;
      if (!socketAuthedRef.current) return;
      if (!fix || !orderId) return;

      socket.emit('delivery:location:update', { orderId, ...fix }, (ack) => {
        if (ack?.ok) {
          setLastSent(new Date());
        } else {
          setStatus(`Send blocked: ${ack?.reason || 'unknown'}`);
        }
      });
    }, EMIT_EVERY_MS);
  };

  const stopEmitLoop = () => {
    try {
      if (emitTimerRef.current) {
        clearInterval(emitTimerRef.current);
        emitTimerRef.current = null;
      }
    } catch {}
  };

  const stopGeoWatch = () => {
    try {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    } catch {}
  };

  const startGeoWatch = (enableHighAccuracy) => {
    if (!('geolocation' in navigator)) {
      setStatus('Geolocation not supported on this device/browser');
      return;
    }

    stopGeoWatch();
    highAccuracyRef.current = Boolean(enableHighAccuracy);
    setStatus(enableHighAccuracy ? 'Getting high-accuracy GPS…' : 'Getting GPS…');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = coerceNumber(pos?.coords?.latitude);
        const lng = coerceNumber(pos?.coords?.longitude);
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const accuracy = coerceNumber(pos?.coords?.accuracy);
        const speed = coerceNumber(pos?.coords?.speed);
        const heading = coerceNumber(pos?.coords?.heading);
        const timestamp = typeof pos?.timestamp === 'number' ? pos.timestamp : Date.now();

        const fix = {
          lat,
          lng,
          accuracy: typeof accuracy === 'number' ? accuracy : undefined,
          speed: typeof speed === 'number' ? speed : undefined,
          heading: typeof heading === 'number' ? heading : undefined,
          timestamp,
        };

        latestFixRef.current = fix;
        setLastCoords({ lat, lng });
        setLastFix(fix);

        const prev = lastFixForMotionRef.current;
        let movingNow = false;
        if (typeof speed === 'number') {
          movingNow = speed >= MOVING_SPEED_M_S;
        } else if (prev && typeof prev.lat === 'number' && typeof prev.lng === 'number' && typeof prev.timestamp === 'number') {
          const dtS = Math.max(0.001, (timestamp - prev.timestamp) / 1000);
          const distM = haversineMeters({ lat: prev.lat, lng: prev.lng }, { lat, lng });
          const approxSpeed = distM / dtS;
          movingNow = approxSpeed >= MOVING_SPEED_M_S || distM >= STATIONARY_DISTANCE_M;
        }

        if (movingNow) {
          stationarySinceRef.current = null;
        } else if (!stationarySinceRef.current) {
          stationarySinceRef.current = Date.now();
        }

        setMoving(movingNow);

        // Battery: upgrade accuracy quickly when moving, downgrade after being stationary for a while.
        if (movingNow && !highAccuracyRef.current) {
          startGeoWatch(true);
        }
        if (!movingNow && highAccuracyRef.current) {
          const since = stationarySinceRef.current;
          if (since && Date.now() - since >= STATIONARY_DOWNGRADE_AFTER_MS) {
            startGeoWatch(false);
          }
        }

        lastFixForMotionRef.current = { lat, lng, timestamp };
      },
      (err) => {
        setStatus(`Location error: ${err?.message || err?.code || 'unknown'}`);
        setRunning(false);
      },
      {
        enableHighAccuracy: Boolean(enableHighAccuracy),
        // Allow cached locations when stationary, but keep it fresh when moving.
        maximumAge: enableHighAccuracy ? 0 : 10000,
        timeout: 20000,
      }
    );
  };

  const connectSocket = () => {
    const socket = createSocketForAuthToken(token);
    socketRef.current = socket;
    socketAuthedRef.current = false;

    return new Promise((resolve, reject) => {
      const done = (ok) => {
        if (ok) resolve(socket);
        else reject(new Error('socket_auth_failed'));
      };

      const auth = () => {
        setSocketConnected(true);
        setStatus('Connected. Authenticating…');
        socket.emit('authDeliveryBoy', { token, orderId, deliveryBoyId }, (ack) => {
          if (!ack?.ok) {
            setStatus(`Auth failed: ${ack?.reason || 'unknown'}`);
            done(false);
            return;
          }

          socketAuthedRef.current = true;

          socket.emit('joinOrder', { orderId }, (joinAck) => {
            if (!joinAck?.ok) {
              setStatus(`Join failed: ${joinAck?.reason || 'unknown'}`);
              done(false);
              return;
            }

            setStatus('You are live');
            done(true);
          });
        });
      };

      socket.on('connect', auth);
      socket.on('disconnect', () => {
        setSocketConnected(false);
        setStatus('Disconnected. Reconnecting…');
      });
      socket.on('connect_error', (err) => {
        setStatus(`Socket error: ${err?.message || 'connect_error'}`);
      });

      if (socket.connected) auth();
    });
  };

  const start = async () => {
    if (!canStart) {
      setStatus('Missing orderId / deliveryBoyId / token in URL');
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatus('Geolocation not supported on this device/browser');
      return;
    }

    setRunning(true);

    try {
      await connectSocket();
    } catch {
      setRunning(false);
      return;
    }

    startGeoWatch(false);
    startEmitLoop();
  };

  const stop = () => {
    setRunning(false);
    setStatus('Stopped');

    stopEmitLoop();
    stopGeoWatch();

    latestFixRef.current = null;
    lastFixForMotionRef.current = null;
    stationarySinceRef.current = null;
    highAccuracyRef.current = false;
    socketAuthedRef.current = false;

    try {
      socketRef.current?.emit('leaveOrder', { orderId });
      socketRef.current?.disconnect();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Live Tracker</h1>
        <p className="text-sm text-gray-600">
          This page sends your GPS location to the server for a specific order.
        </p>

        <div className="text-sm bg-gray-50 rounded-lg p-4 space-y-1">
          <div><span className="font-semibold">Order:</span> {orderId || '—'}</div>
          <div><span className="font-semibold">Delivery boy:</span> {deliveryBoyId || '—'}</div>
          <div className="flex items-center justify-between">
            <div><span className="font-semibold">Status:</span> {status || '—'}</div>
            <div className={isLive ? 'text-green-600 font-semibold' : 'text-gray-500'}>
              {isLive ? 'You are live' : 'Not live'}
            </div>
          </div>
          <div><span className="font-semibold">Socket:</span> {socketConnected ? 'Connected' : 'Disconnected'}</div>
          <div><span className="font-semibold">Motion:</span> {moving ? 'Moving (high accuracy)' : 'Stationary (battery saver)'}</div>
          <div><span className="font-semibold">Last coords:</span> {lastCoords ? `${lastCoords.lat}, ${lastCoords.lng}` : '—'}</div>
          <div><span className="font-semibold">Accuracy:</span> {typeof lastFix?.accuracy === 'number' ? `${Math.round(lastFix.accuracy)} m` : '—'}</div>
          <div><span className="font-semibold">Speed:</span> {typeof lastFix?.speed === 'number' ? `${lastFix.speed.toFixed(1)} m/s` : '—'}</div>
          <div><span className="font-semibold">Heading:</span> {typeof lastFix?.heading === 'number' ? `${Math.round(lastFix.heading)}°` : '—'}</div>
          <div><span className="font-semibold">Fix time:</span> {typeof lastFix?.timestamp === 'number' ? new Date(lastFix.timestamp).toLocaleTimeString() : '—'}</div>
          <div><span className="font-semibold">Last sent:</span> {lastSent ? lastSent.toLocaleTimeString() : '—'}</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={start}
            disabled={running}
            className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-60"
          >
            Start
          </button>
          <button
            onClick={stop}
            disabled={!running}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            Stop
          </button>
        </div>

        {!canStart && (
          <p className="text-xs text-gray-500">
            Open as: <span className="font-mono">/delivery/track?orderId=...&deliveryBoyId=...&token=...</span>
          </p>
        )}
      </div>
    </div>
  );
}
