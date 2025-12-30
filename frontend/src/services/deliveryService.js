import API from './api.js';

export const getMyDeliveryPackages = () => {
  return API.get('/orders/delivery/my-packages');
};

export const startDelivery = (orderId) => {
  return API.put(`/orders/${orderId}/start-delivery`);
};

export const markDelivered = (orderId) => {
  return API.put(`/orders/${orderId}/mark-delivered`);
};
