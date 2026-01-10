import PushSubscription from '../models/PushSubscription.js';
import { getPushDiagnostics, removePushSubscription, sendPushToUser, sendTestPushToAdmins, upsertPushSubscription } from '../utils/pushService.js';

export const getVapidPublicKey = async (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ message: 'VAPID_PUBLIC_KEY is not configured' });
  }
  return res.json({ publicKey: key });
};

export const subscribePush = async (req, res) => {
  try {
    const subscription = req.body?.subscription;
    const userAgent = req.headers['user-agent'] || '';

    const doc = await upsertPushSubscription({
      userId: req.user?._id,
      subscription,
      userAgent,
    });

    res.json({ ok: true, id: doc._id });
  } catch (err) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || 'Failed to subscribe push' });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
    await removePushSubscription({ userId: req.user?._id, endpoint });
    res.json({ ok: true });
  } catch (err) {
    const status = err?.statusCode || 500;
    res.status(status).json({ message: err?.message || 'Failed to unsubscribe push' });
  }
};

export const getPushDiagnosticsController = async (_req, res) => {
  try {
    const diagnostics = getPushDiagnostics();

    // Counts help debug “works on desktop but not phone”.
    const totalSubs = await PushSubscription.countDocuments({});
    res.json({ ok: true, diagnostics, counts: { totalSubscriptions: totalSubs } });
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Failed to get diagnostics' });
  }
};

export const testPushSelf = async (req, res) => {
  try {
    const payload = {
      title: 'Test Push (Self)',
      body: 'Server successfully sent a test push to your saved subscription(s).',
      url: '/admin/orders',
      tag: `test:self:${String(req.user?._id || '')}`,
    };
    const result = await sendPushToUser({ userId: req.user?._id, payload });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Failed to send test push' });
  }
};

export const testPushAdmins = async (_req, res) => {
  try {
    const result = await sendTestPushToAdmins();
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Failed to send admin test push' });
  }
};
