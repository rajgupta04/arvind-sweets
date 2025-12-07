import API from './api.js';

export const createMessage = (data) => {
  return API.post('/messages', data);
};

export const getAllMessages = () => {
  return API.get('/messages');
};

