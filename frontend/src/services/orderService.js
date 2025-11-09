// Order service - API calls for orders
import API from './api.js';

export const createOrder = (orderData) => {
  return API.post('/orders', orderData);
};

export const getMyOrders = () => {
  return API.get('/orders/myorders');
};

export const getOrderById = (id) => {
  return API.get(`/orders/${id}`);
};

export const getAllOrders = () => {
  return API.get('/orders');
};

export const updateOrderStatus = (id, status) => {
  return API.put(`/orders/${id}/status`, { orderStatus: status });
};

export const updateOrderToDelivered = (id) => {
  return API.put(`/orders/${id}/deliver`);
};

