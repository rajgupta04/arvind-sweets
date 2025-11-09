// Auth service - API calls for authentication
import API from './api.js';

export const register = (userData) => {
  return API.post('/users/register', userData);
};

export const login = (email, password) => {
  return API.post('/users/login', { email, password });
};

export const getProfile = () => {
  return API.get('/users/profile');
};

export const updateProfile = (userData) => {
  return API.put('/users/profile', userData);
};

export const getAllUsers = () => {
  return API.get('/users');
};

