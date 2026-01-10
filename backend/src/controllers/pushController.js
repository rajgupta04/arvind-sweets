import { removePushSubscription, upsertPushSubscription } from '../utils/pushService.js';

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
