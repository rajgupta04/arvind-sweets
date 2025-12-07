// Admin API service - Product & Order management
import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with auth token
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add token to requests
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
};

const api = createApiInstance();

// Get all products
export const getAllProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

// Get product by ID
export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Create product
export const createProduct = async (productData) => {
  const response = await api.post('/products', productData);
  return response.data;
};

// Update product
export const updateProduct = async (id, productData) => {
  const response = await api.put(`/products/${id}`, productData);
  return response.data;
};

// Delete product
export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

// ---------------------------
// Orders
// ---------------------------

export const getAllOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const getLatestOrder = async () => {
  const response = await api.get('/orders/latest');
  return response.data;
};

export const updateOrderStatus = async (id, orderStatus) => {
  const response = await api.put(`/orders/${id}/status`, { orderStatus });
  return response.data;
};

// ---------------------------
// Settings
// ---------------------------

export const getSettings = async () => {
  const response = await api.get('/settings/get');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.put('/settings/update', settings);
  return response.data;
};
