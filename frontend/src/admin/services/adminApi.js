import API from '../../services/api.js';

// Get all products
export const getAllProducts = async () => {
  const response = await API.get('/products');
  return response.data;
};

// Get product by ID
export const getProductById = async (id) => {
  const response = await API.get(`/products/${id}`);
  return response.data;
};

// Create product
export const createProduct = async (productData) => {
  const response = await API.post('/products', productData);
  return response.data;
};

// Update products
export const updateProduct = async (id, productData) => {
  const response = await API.put(`/products/${id}`, productData);
  return response.data;
};

// Delete product
export const deleteProduct = async (id) => {
  const response = await API.delete(`/products/${id}`);
  return response.data;
};

// ---------------------------
// Orders
// ---------------------------

export const getAllOrders = async () => {
  const response = await API.get('/orders');
  return response.data;
};

export const getLatestOrder = async () => {
  const response = await API.get('/orders/latest');
  return response.data;
};

export const updateOrderStatus = async (id, orderStatus) => {
  const response = await API.put(`/orders/${id}/status`, { orderStatus });
  return response.data;
};

// ---------------------------
// Settings
// ---------------------------

export const getSettings = async () => {
  const response = await API.get('/settings/get');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await API.put('/settings/update', settings);
  return response.data;
};
