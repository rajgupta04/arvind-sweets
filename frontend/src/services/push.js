import API from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getVapidPublicKey() {
  const res = await API.get('/push/vapid-public-key');
  return res.data?.publicKey;
}

export async function ensurePushSubscribed() {
  if (typeof window === 'undefined') {
    throw new Error('Not supported');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker not supported');
  }

  if (!('PushManager' in window)) {
    throw new Error('Push not supported');
  }

  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const reg = await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await API.post('/push/subscribe', { subscription: existing });
    return { ok: true, status: 'already-subscribed', endpoint: existing.endpoint };
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error('Missing VAPID public key');
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await API.post('/push/subscribe', { subscription });

  return { ok: true, status: 'subscribed', endpoint: subscription.endpoint };
}
