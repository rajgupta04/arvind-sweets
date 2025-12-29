import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Order from './models/Order.js';
import DeliveryBoy from './models/DeliveryBoy.js';
import { trackingStore } from './utils/trackingStore.js';

function parseAllowedOrigins() {
  const origins = [];
  const single = process.env.FRONTEND_URL;
  if (single) origins.push(String(single).trim());

  const list = process.env.FRONTEND_URLS;
  if (list) {
    String(list)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((o) => origins.push(o));
  }

  // If nothing configured, allow all (useful for local dev).
  return origins;
}

function tryVerifyJwt(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

function getOrderRoom(orderId) {
  return `order:${String(orderId)}`;
}

// Backward-compatible legacy room name (pre-spec)
function getLegacyOrderRoom(orderId) {
  return `order_${String(orderId)}`;
}

function coerceNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceIsoTimestamp(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function initSocket(httpServer, { app } = {}) {
  const allowedOrigins = parseAllowedOrigins();

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Optional: authenticate via handshake
    const bearer = socket.handshake.headers?.authorization;
    const headerToken = bearer && bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null;
    const handshakeToken = socket.handshake.auth?.token || socket.handshake.query?.token || headerToken;

    const decoded = tryVerifyJwt(handshakeToken);
    if (decoded) {
      socket.data.user = {
        id: decoded.id || decoded._id,
        role: decoded.role,
      };

      // If this is a delivery tracking token, mark as delivery boy session and join order room immediately.
      if (decoded.type === 'delivery_tracking' && decoded.deliveryBoyId && decoded.orderId) {
        socket.data.deliveryBoyId = String(decoded.deliveryBoyId);
        socket.data.deliveryOrderId = String(decoded.orderId);

        const room = getOrderRoom(decoded.orderId);
        const legacyRoom = getLegacyOrderRoom(decoded.orderId);
        socket.join(room);
        socket.join(legacyRoom);
      }
    }

    socket.on('authUser', ({ token } = {}, ack) => {
      const nextDecoded = tryVerifyJwt(token);
      if (!nextDecoded) {
        ack?.({ ok: false, reason: 'invalid_token' });
        return;
      }
      socket.data.user = {
        id: nextDecoded.id || nextDecoded._id,
        role: nextDecoded.role,
      };
      ack?.({ ok: true });
    });

    socket.on('authDeliveryBoy', async ({ token, deliveryBoyId, orderId } = {}, ack) => {
      // Token-only auth (secure)
      if (!token) {
        ack?.({ ok: false, reason: 'token_required' });
        return;
      }

      const decoded = tryVerifyJwt(token);
      if (!decoded || decoded.type !== 'delivery_tracking' || !decoded.deliveryBoyId || !decoded.orderId) {
        ack?.({ ok: false, reason: 'invalid_token' });
        return;
      }

      if (deliveryBoyId && String(deliveryBoyId) !== String(decoded.deliveryBoyId)) {
        ack?.({ ok: false, reason: 'deliveryBoy_mismatch' });
        return;
      }
      if (orderId && String(orderId) !== String(decoded.orderId)) {
        ack?.({ ok: false, reason: 'order_mismatch' });
        return;
      }

      const deliveryBoy = await DeliveryBoy.findById(decoded.deliveryBoyId);
      if (!deliveryBoy) {
        ack?.({ ok: false, reason: 'invalid_delivery_boy' });
        return;
      }

      socket.data.deliveryBoyId = String(deliveryBoy._id);
      socket.data.deliveryOrderId = String(decoded.orderId);
      deliveryBoy.socketId = socket.id;
      await deliveryBoy.save();

      // Spec: when delivery boy connects, join room order:<orderId>
      const room = getOrderRoom(decoded.orderId);
      const legacyRoom = getLegacyOrderRoom(decoded.orderId);
      socket.join(room);
      socket.join(legacyRoom);

      ack?.({ ok: true });
    });

    socket.on('joinOrder', async ({ orderId } = {}, ack) => {
      try {
        if (!orderId) return ack?.({ ok: false, reason: 'orderId_required' });

        const order = await Order.findById(orderId);
        if (!order) return ack?.({ ok: false, reason: 'order_not_found' });

        const room = getOrderRoom(orderId);
        const legacyRoom = getLegacyOrderRoom(orderId);

        const user = socket.data.user;
        const deliveryBoyId = socket.data.deliveryBoyId;

        const isAdmin = user?.role === 'admin';
        const isOwner = user?.id && String(order.user) === String(user.id);
        const isAssignedDriver =
          deliveryBoyId && order.assignedDeliveryBoy && String(order.assignedDeliveryBoy) === String(deliveryBoyId);

        if (!isAdmin && !isOwner && !isAssignedDriver) {
          return ack?.({ ok: false, reason: 'not_authorized' });
        }

        socket.join(room);
        socket.join(legacyRoom);
        ack?.({ ok: true, room });
      } catch (err) {
        ack?.({ ok: false, reason: err?.message || 'join_failed' });
      }
    });

    socket.on('leaveOrder', ({ orderId } = {}, ack) => {
      if (!orderId) return ack?.({ ok: false, reason: 'orderId_required' });
      socket.leave(getOrderRoom(orderId));
      socket.leave(getLegacyOrderRoom(orderId));
      ack?.({ ok: true });
    });

    async function handleDeliveryLocationUpdate(payload = {}, ack) {
      try {
        const { orderId } = payload;
        const lat = coerceNumber(payload.lat);
        const lng = coerceNumber(payload.lng);
        const accuracy = coerceNumber(payload.accuracy);
        const speed = coerceNumber(payload.speed);
        const heading = coerceNumber(payload.heading);
        const timestamp = coerceIsoTimestamp(payload.timestamp);

        if (!orderId || typeof lat !== 'number' || typeof lng !== 'number') {
          return ack?.({ ok: false, reason: 'invalid_payload' });
        }

        if (socket.data.deliveryOrderId && String(orderId) !== String(socket.data.deliveryOrderId)) {
          return ack?.({ ok: false, reason: 'order_mismatch' });
        }

        const order = await Order.findById(orderId);
        if (!order) return ack?.({ ok: false, reason: 'order_not_found' });

        const deliveryBoyId = socket.data.deliveryBoyId;
        if (!deliveryBoyId || !order.assignedDeliveryBoy || String(order.assignedDeliveryBoy) !== String(deliveryBoyId)) {
          return ack?.({ ok: false, reason: 'not_authorized' });
        }

        if (!order.liveTrackingEnabled) {
          return ack?.({ ok: false, reason: 'tracking_disabled' });
        }

        if (order.orderStatus !== 'Out for Delivery') {
          // Stop tracking if order is already delivered/cancelled or not yet out.
          return ack?.({ ok: false, reason: 'not_out_for_delivery' });
        }

        const now = new Date();

        // Spec: store last known location in memory (Redis-ready store)
        await trackingStore.set(String(orderId), {
          orderId: String(orderId),
          lat,
          lng,
          accuracy: typeof accuracy === 'number' ? accuracy : undefined,
          speed: typeof speed === 'number' ? speed : undefined,
          heading: typeof heading === 'number' ? heading : undefined,
          timestamp: timestamp || undefined,
          updatedAt: now.toISOString(),
        });

        // Optional: keep DB fields in sync for admin views / history
        order.lastDeliveryLocation = { lat, lng, updatedAt: now };
        await order.save();

        await DeliveryBoy.findByIdAndUpdate(deliveryBoyId, {
          currentLocation: { lat, lng, updatedAt: now },
        }).catch(() => {});

        const room = getOrderRoom(orderId);
        const legacyRoom = getLegacyOrderRoom(orderId);

        const outgoing = {
          orderId: String(orderId),
          lat,
          lng,
          accuracy: typeof accuracy === 'number' ? accuracy : undefined,
          speed: typeof speed === 'number' ? speed : undefined,
          heading: typeof heading === 'number' ? heading : undefined,
          timestamp: timestamp || undefined,
          updatedAt: now.toISOString(),
        };

        // Spec: broadcast to all users in same room
        io.to(room).emit('delivery:location:update', outgoing);

        // Backward-compatible broadcasts
        io.to(legacyRoom).emit('delivery:location:update', outgoing);
        io.to(legacyRoom).emit('orderLocationUpdate', {
          orderId: String(orderId),
          location: { lat, lng, updatedAt: now.toISOString() },
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, reason: err?.message || 'update_failed' });
      }
    }

    // Spec event name
    socket.on('delivery:location:update', handleDeliveryLocationUpdate);
    // Backward-compatible legacy event name
    socket.on('deliveryLocationUpdate', handleDeliveryLocationUpdate);
  });

  if (app) {
    app.set('io', io);
  }

  return io;
}
