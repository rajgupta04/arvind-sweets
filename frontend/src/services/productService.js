// Product service - API calls for products
import API from './api.js';

export const getProducts = (params = {}) => {
  return API.get('/products', { params });
};

export const getProductById = (id) => {
  return API.get(`/products/${id}`);
};

export const createProduct = (productData) => {
  return API.post('/products', productData);
};

export const updateProduct = (id, productData) => {
  return API.put(`/products/${id}`, productData);
};

export const deleteProduct = (id) => {
  return API.delete(`/products/${id}`);
};
