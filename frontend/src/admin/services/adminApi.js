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

export const assignDeliveryBoyToOrder = async (orderId, { deliveryBoyId, liveTrackingEnabled } = {}) => {
  const body = {
    deliveryBoyId: deliveryBoyId || null,
  };
  if (typeof liveTrackingEnabled === 'boolean') {
    body.liveTrackingEnabled = liveTrackingEnabled;
  }

  const response = await API.put(`/orders/${orderId}/assign-delivery`, body);
  return response.data;
};

export const setOrderTrackingEnabled = async (orderId, enabled) => {
  const response = await API.put(`/orders/${orderId}/tracking`, {
    enabled: Boolean(enabled),
  });
  return response.data;
};

export const generateDeliveryTrackingLink = async (orderId, { deliveryBoyId } = {}) => {
  const response = await API.post(`/orders/${orderId}/tracking-link`, {
    deliveryBoyId: deliveryBoyId || null,
  });
  return response.data;
};

// ---------------------------
// Users (Admin)
// ---------------------------

export const listUsers = async () => {
  const response = await API.get('/users');
  return response.data;
};

export const createUser = async ({ name, email, phone, role, password, sweetCoinBalance } = {}) => {
  const response = await API.post('/users', {
    name,
    email,
    phone,
    role,
    password,
    ...(sweetCoinBalance !== undefined ? { sweetCoinBalance } : {}),
  });
  return response.data;
};

export const updateUser = async (id, { name, email, phone, role, password, sweetCoinBalance } = {}) => {
  const response = await API.put(`/users/${id}`, {
    name,
    email,
    phone,
    role,
    password,
    ...(sweetCoinBalance !== undefined ? { sweetCoinBalance } : {}),
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await API.delete(`/users/${id}`);
  return response.data;
};

// ---------------------------
// Delivery Boys
// ---------------------------

// New (role-based): delivery boys are normal users with role=delivery_boy
export const listDeliveryBoyUsers = async () => {
  const response = await API.get('/users/delivery-boys');
  return response.data;
};

export const listDeliveryBoys = async ({ isActive } = {}) => {
  const response = await API.get('/delivery-boys', {
    params: typeof isActive === 'boolean' ? { isActive: String(isActive) } : undefined,
  });
  return response.data;
};

export const createDeliveryBoy = async ({ name, phone, isActive } = {}) => {
  const response = await API.post('/delivery-boys', { name, phone, isActive });
  return response.data;
};

export const updateDeliveryBoy = async (id, updates) => {
  const response = await API.put(`/delivery-boys/${id}`, updates);
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

// ---------------------------
// Offers
// ---------------------------

export const listOffers = async () => {
  const response = await API.get('/offers');
  return response.data;
};

export const createOffer = async ({ title, description, ctaText, ctaLink, active, startsAt, endsAt } = {}) => {
  const response = await API.post('/offers', {
    title,
    description,
    ctaText,
    ctaLink,
    active,
    startsAt,
    endsAt,
  });
  return response.data;
};

export const updateOffer = async (id, { title, description, ctaText, ctaLink, active, startsAt, endsAt } = {}) => {
  const response = await API.put(`/offers/${id}`, {
    title,
    description,
    ctaText,
    ctaLink,
    active,
    startsAt,
    endsAt,
  });
  return response.data;
};

export const deleteOffer = async (id) => {
  const response = await API.delete(`/offers/${id}`);
  return response.data;
};

// ---------------------------
// Notifications (Admin testing)
// ---------------------------

export const sendAdminNotification = async ({
  audience = 'all',
  role,
  email,
  userId,
  title,
  message,
  url,
} = {}) => {
  const response = await API.post('/notifications/admin/send', {
    audience,
    role,
    email,
    userId,
    title,
    message,
    url,
  });
  return response.data;
};

// ---------------------------
// Coupons
// ---------------------------

export const listCoupons = async () => {
  const response = await API.get('/coupons');
  return response.data;
};

export const createCoupon = async (coupon) => {
  const response = await API.post('/coupons', coupon);
  return response.data;
};

export const updateCoupon = async (id, updates) => {
  const response = await API.put(`/coupons/${id}`, updates);
  return response.data;
};

export const deleteCoupon = async (id) => {
  const response = await API.delete(`/coupons/${id}`);
  return response.data;
};
