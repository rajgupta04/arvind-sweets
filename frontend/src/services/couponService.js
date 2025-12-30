import API from './api.js';

export const getPopupCoupon = async () => {
  const response = await API.get('/coupons/popup');
  return response.data;
};

export const validateCoupon = async ({ code, itemsPrice }) => {
  const response = await API.post('/coupons/validate', {
    code,
    itemsPrice,
  });
  return response.data;
};
