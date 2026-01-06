import { api } from './api';

// Live tracking endpoints:
// GET  /orders/:id/tracking
// POST /tracking/update

export async function fetchOrderTracking(orderId) {
  const res = await api.get(`/orders/${orderId}/tracking`);
  return res.data;
}

export async function postTrackingUpdate({ orderId, lat, lng }) {
  // Backend contract assumed. If your backend expects different keys (e.g. latitude/longitude),
  // adjust here without touching UI code.
  const res = await api.post('/tracking/update', { orderId, lat, lng });
  return res.data;
}
