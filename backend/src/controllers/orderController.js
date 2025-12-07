// Order controller - business logic for order routes
import Order from '../models/Order.js';
import { notifyOwner } from '../utils/notifyOwner.js';
import { sendOrderEmail } from '../utils/sendEmail.js';
// ETA via haversine-based calculation will be computed inline in createOrder
import Settings from '../models/Settings.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      deliveryType,
      itemsPrice,
      deliveryCharge,
      totalPrice,
      paymentStatus,
      userLatitude,
      userLongitude
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const orderData = {
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      deliveryType,
      itemsPrice,
      deliveryCharge,
      totalPrice,
      paymentStatus: paymentStatus || 'Pending'
    };

    // Haversine-based ETA calculation
    try {
      const SHOP_LAT = Number(process.env.SHOP_LAT);
      const SHOP_LNG = Number(process.env.SHOP_LNG);
      const loc = shippingAddress?.location;
      const uLat = typeof userLatitude === 'number' ? userLatitude : (loc?.lat);
      const uLng = typeof userLongitude === 'number' ? userLongitude : (loc?.lng);

      if (
        typeof SHOP_LAT === 'number' && !Number.isNaN(SHOP_LAT) &&
        typeof SHOP_LNG === 'number' && !Number.isNaN(SHOP_LNG) &&
        typeof uLat === 'number' && typeof uLng === 'number'
      ) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371; // Earth radius in km
        const dLat = toRad(uLat - SHOP_LAT);
        const dLng = toRad(uLng - SHOP_LNG);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(SHOP_LAT)) * Math.cos(toRad(uLat)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Number((R * c).toFixed(2));

        let buffer = 10; // minutes default
        try {
          const settings = await Settings.findOne();
          if (settings && typeof settings.deliveryBuffer === 'number') {
            buffer = settings.deliveryBuffer;
          }
        } catch {}
        const deliveryTimeMinutes = Math.round(distanceKm * 4 + buffer);
        const estimatedDelivery = new Date(Date.now() + deliveryTimeMinutes * 60000);

        orderData.distanceKm = distanceKm;
        orderData.travelTimeMin = deliveryTimeMinutes;
        orderData.estimatedDelivery = estimatedDelivery;
        orderData.deliveryBuffer = buffer;
      }
    } catch (etaError) {
      console.warn('ETA calculation failed:', etaError.message);
    }

    const order = new Order(orderData);

    const createdOrder = await order.save();
    const populatedOrder = await createdOrder.populate('user', 'name email');

    notifyOwner(populatedOrder);
    sendOrderEmail(populatedOrder);

    const responseBody = populatedOrder.toObject({ virtuals: false });
    if (responseBody.travelTimeMin != null && responseBody.deliveryTimeMinutes == null) {
      responseBody.deliveryTimeMinutes = responseBody.travelTimeMin;
    }
    res.status(201).json(responseBody);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
      if (order.user._id.toString() === req.user._id.toString() || req.user.role === 'admin') {
        res.json(order);
      } else {
        res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderStatus = 'Delivered';
      order.deliveredAt = Date.now();

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.orderStatus = orderStatus;
      if (orderStatus === 'Delivered') {
        order.deliveredAt = Date.now();
      }

      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get latest order for admin polling
// @route   GET /api/orders/latest
// @access  Private/Admin
export const getLatestOrder = async (req, res) => {
  try {
    const order = await Order.findOne({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(order || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
