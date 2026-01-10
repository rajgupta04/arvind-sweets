import webpush from 'web-push';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';

function isConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      (process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL)
  );
}

export function getPushDiagnostics() {
  const subject = process.env.VAPID_SUBJECT || (process.env.VAPID_EMAIL ? `mailto:${process.env.VAPID_EMAIL}` : null);
  return {
    configured: isConfigured(),
    hasPublicKey: Boolean(process.env.VAPID_PUBLIC_KEY),
    hasPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    subject,
  };
}

function ensureConfigured() {
  if (!isConfigured()) return false;

  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.VAPID_EMAIL}`;
  webpush.setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return true;
}

function normalizeSubscription(raw) {
  const endpoint = String(raw?.endpoint || '').trim();
  const p256dh = String(raw?.keys?.p256dh || '').trim();
  const auth = String(raw?.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) return null;

  const expirationTime = raw?.expirationTime == null ? null : Number(raw.expirationTime);
  return {
    endpoint,
    expirationTime: Number.isFinite(expirationTime) ? expirationTime : null,
    keys: { p256dh, auth },
  };
}

async function sendOne(subscriptionDoc, payload) {
  const subscription = {
    endpoint: subscriptionDoc.endpoint,
    expirationTime: subscriptionDoc.expirationTime,
    keys: subscriptionDoc.keys,
  };

  const body = JSON.stringify(payload || {});

  try {
    await webpush.sendNotification(subscription, body);
    return { ok: true };
  } catch (err) {
    const statusCode = err?.statusCode;
    // 404/410 means subscription is gone; cleanup.
    if (statusCode === 404 || statusCode === 410) {
      try {
        await PushSubscription.deleteOne({ _id: subscriptionDoc._id });
      } catch {}
    }
    return { ok: false, statusCode, message: err?.message || 'push_failed' };
  }
}

export async function sendPushToSubscriptions(subscriptions, payload) {
  if (!ensureConfigured()) {
    return { ok: false, reason: 'vapid_not_configured', delivered: 0, attempted: 0 };
  }

  const subs = Array.isArray(subscriptions) ? subscriptions : [];
  if (!subs.length) return { ok: true, delivered: 0, attempted: 0 };

  const results = await Promise.allSettled(subs.map((s) => sendOne(s, payload)));
  const delivered = results.filter((r) => r.status === 'fulfilled' && r.value?.ok).length;
  return { ok: true, delivered, attempted: subs.length };
}

export async function sendPushToUser({ userId, payload } = {}) {
  const subs = await PushSubscription.find({ user: userId }).lean();
  const result = await sendPushToSubscriptions(subs, payload);
  return { ...result, userId: String(userId || '') };
}

export async function upsertPushSubscription({ userId, subscription, userAgent } = {}) {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) {
    const err = new Error('Invalid subscription payload');
    err.statusCode = 400;
    throw err;
  }

  const doc = await PushSubscription.findOneAndUpdate(
    { endpoint: normalized.endpoint },
    {
      $set: {
        user: userId,
        endpoint: normalized.endpoint,
        expirationTime: normalized.expirationTime,
        keys: normalized.keys,
        userAgent: String(userAgent || '').slice(0, 400),
      },
    },
    { new: true, upsert: true }
  );

  return doc;
}

export async function removePushSubscription({ userId, endpoint } = {}) {
  const ep = String(endpoint || '').trim();
  if (!ep) {
    const err = new Error('endpoint is required');
    err.statusCode = 400;
    throw err;
  }

  await PushSubscription.deleteOne({ user: userId, endpoint: ep });
  return { ok: true };
}

export async function sendPushToAdminsOnNewOrder({ order } = {}) {
  if (!ensureConfigured()) {
    return { ok: false, reason: 'vapid_not_configured' };
  }

  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  const adminIds = admins.map((a) => a._id);
  if (!adminIds.length) return { ok: true, delivered: 0 };

  const subs = await PushSubscription.find({ user: { $in: adminIds } }).lean();
  if (!subs.length) return { ok: true, delivered: 0 };

  const orderId = String(order?._id || order?.id || '');
  const amount = order?.totalPrice != null ? Number(order.totalPrice) : null;

  const payload = {
    title: 'New Order Received',
    body: orderId ? `Order ${orderId}${amount != null ? ` • ₹${amount}` : ''}` : 'A new order was placed',
    url: '/admin/orders',
    tag: orderId ? `order:${orderId}` : 'order:new',
  };

  const results = await Promise.allSettled(subs.map((s) => sendOne(s, payload)));
  const delivered = results.filter((r) => r.status === 'fulfilled' && r.value?.ok).length;

  return { ok: true, delivered, attempted: subs.length };
}

export async function sendTestPushToAdmins() {
  const diagnostics = getPushDiagnostics();
  if (!diagnostics.configured) {
    return { ok: false, reason: 'vapid_not_configured', diagnostics };
  }

  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  const adminIds = admins.map((a) => a._id);
  const subs = await PushSubscription.find({ user: { $in: adminIds } }).lean();

  const payload = {
    title: 'Test Push',
    body: 'If you see this, push works even when the app is closed.',
    url: '/admin/orders',
    tag: 'test:push',
  };

  const result = await sendPushToSubscriptions(subs, payload);
  return { ...result, admins: adminIds.length, subscriptions: subs.length };
}
