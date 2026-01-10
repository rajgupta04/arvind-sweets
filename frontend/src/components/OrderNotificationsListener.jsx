import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NotificationsContext } from '../context/NotificationsContext';
import { getMyOrders } from '../services/orderService';
import { createSocket } from '../services/socket';
import { toast } from './ui/use-toast';

function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

const NEARBY_KEY = 'as_delivery_nearby_v1';
const DELIVERED_KEY = 'as_order_delivered_v1';

function loadNearbyMap() {
  try {
    const raw = localStorage.getItem(NEARBY_KEY);
    const j = JSON.parse(raw || '{}');
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

function saveNearbyMap(map) {
  try {
    localStorage.setItem(NEARBY_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

function loadDeliveredMap() {
  try {
    const raw = localStorage.getItem(DELIVERED_KEY);
    const j = JSON.parse(raw || '{}');
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

function saveDeliveredMap(map) {
  try {
    localStorage.setItem(DELIVERED_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

export default function OrderNotificationsListener() {
  const { user } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationsContext);

  const socketRef = useRef(null);
  const joinedOrdersRef = useRef(new Set());
  const ordersByIdRef = useRef(new Map());
  const nearbySentRef = useRef(loadNearbyMap());
  const deliveredSentRef = useRef(loadDeliveredMap());

  const [ready, setReady] = useState(false);

  const enabled = Boolean(user && user?.role === 'customer');

  const fetchAndJoin = async (socket) => {
    try {
      const res = await getMyOrders();
      const list = Array.isArray(res.data) ? res.data : [];

      // Cache orders for later use in notifications (coin earned, address location, etc)
      for (const o of list) {
        if (o?._id) ordersByIdRef.current.set(String(o._id), o);
      }

      // Join only active orders to reduce socket chatter
      const active = list.filter((o) => {
        const s = String(o?.orderStatus || '').trim();
        return s && s !== 'Delivered' && s !== 'Cancelled';
      });

      for (const o of active) {
        const orderId = String(o._id);
        if (joinedOrdersRef.current.has(orderId)) continue;
        socket.emit('joinOrder', { orderId }, (ack) => {
          if (ack?.ok) joinedOrdersRef.current.add(orderId);
        });
      }

      setReady(true);
    } catch {
      // ignore
    }
  };

  const emitNear500mOnce = (orderId, distanceKm) => {
    if (!orderId) return;
    const already = Boolean(nearbySentRef.current?.[orderId]);
    if (already) return;
    if (!(Number.isFinite(distanceKm) && distanceKm <= 0.5)) return;

    nearbySentRef.current = { ...(nearbySentRef.current || {}), [orderId]: true };
    saveNearbyMap(nearbySentRef.current);

    const title = 'Knock knock! 🚪✨';
    const message = 'Your delivery is super close (within ~500m). Plates ready? 😄';

    addNotification({
      type: 'delivery_nearby',
      title,
      message,
      orderId,
      actions: [
        { label: 'Track order', to: `/orders/${orderId}` },
        { label: 'Order now', to: '/products' },
      ],
    });

    toast({ title, description: message });
  };

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    const socket = createSocket();
    socketRef.current = socket;

    const onConnect = () => {
      fetchAndJoin(socket);
    };

    const onOrderStatusUpdated = (payload) => {
      const orderId = payload?.orderId ? String(payload.orderId) : '';
      if (!orderId) return;

      const status = String(payload?.orderStatus || '').trim();
      if (!status) return;

      // Delivered notification (with SweetCoin earned)
      if (status === 'Delivered') {
        if (Boolean(deliveredSentRef.current?.[orderId])) return;
        deliveredSentRef.current = { ...(deliveredSentRef.current || {}), [orderId]: true };
        saveDeliveredMap(deliveredSentRef.current);

        const order = ordersByIdRef.current.get(orderId);
        const earned = Math.max(0, Math.floor(Number(order?.sweetCoinEarned) || 0));

        const title = 'Yaaay! Delivered 🎉';
        const message = earned > 0
          ? `Enjoy your sweets! You just earned 🪙 ${earned} SweetCoin. Redeem it on your next order.`
          : 'Enjoy your sweets! Thanks for ordering with us.';

        addNotification({
          type: 'order_delivered',
          title,
          message,
          orderId,
          actions: [
            { label: 'Order now', to: '/products' },
            { label: 'View order', to: `/orders/${orderId}` },
          ],
          meta: earned > 0 ? { sweetCoinEarned: earned } : {},
        });

        toast({ title, description: message });
      }
    };

    const onLocationUpdate = (orderId, lat, lng) => {
      if (!orderId) return;
      const order = ordersByIdRef.current.get(orderId);
      const dest = order?.shippingAddress?.location;
      if (!dest || typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return;

      const dKm = haversineKm(dest.lat, dest.lng, lat, lng);
      emitNear500mOnce(orderId, dKm);
    };

    const onDeliveryLocationUpdate = (payload) => {
      const orderId = payload?.orderId ? String(payload.orderId) : '';
      if (!orderId) return;
      if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;
      onLocationUpdate(orderId, payload.lat, payload.lng);
    };

    const onLegacyLocationUpdate = (payload) => {
      const orderId = payload?.orderId ? String(payload.orderId) : '';
      if (!orderId) return;
      const loc = payload?.location;
      if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
      onLocationUpdate(orderId, loc.lat, loc.lng);
    };

    socket.on('connect', onConnect);
    socket.on('orderStatusUpdated', onOrderStatusUpdated);
    socket.on('delivery:location:update', onDeliveryLocationUpdate);
    socket.on('orderLocationUpdate', onLegacyLocationUpdate);

    // Kick once if already connected
    if (socket.connected) onConnect();

    const interval = setInterval(() => {
      // Refresh active orders every ~60s
      if (socketRef.current && socketRef.current.connected) {
        fetchAndJoin(socketRef.current);
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      try {
        socket.off('connect', onConnect);
        socket.off('orderStatusUpdated', onOrderStatusUpdated);
        socket.off('delivery:location:update', onDeliveryLocationUpdate);
        socket.off('orderLocationUpdate', onLegacyLocationUpdate);
        socket.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
      joinedOrdersRef.current = new Set();
      ordersByIdRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // No UI.
  return null;
}
