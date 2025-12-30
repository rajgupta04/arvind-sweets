import API from './api.js';

export const getActiveOffer = async () => {
  const response = await API.get('/offers/active');
  return response.data;
};
