import { api } from './api';

// Orders endpoints:
// GET /orders/my
// GET /orders/:id

export async function fetchMyOrders() {
  const res = await api.get('/orders/my');
  return res.data;
}

export async function fetchOrderById(orderId) {
  const res = await api.get(`/orders/${orderId}`);
  return res.data;
}
