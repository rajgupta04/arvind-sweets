// Order controller - business logic for order routes
import Order from '../models/Order.js';
import DeliveryBoy from '../models/DeliveryBoy.js';
import jwt from 'jsonwebtoken';
import { notifyOwner } from '../utils/notifyOwner.js';
import { sendOrderEmail } from '../utils/sendEmail.js';
// ETA via haversine-based calculation will be computed inline in createOrder
import Settings from '../models/Settings.js';
import { trackingStore } from '../utils/trackingStore.js';
import User from '../models/User.js';

function getFrontendBaseUrl() {
  const single = process.env.FRONTEND_URL;
  if (single) return String(single).trim().replace(/\/$/, '');

  const list = process.env.FRONTEND_URLS;
  if (list) {
    const first = String(list)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (first) return first.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
}

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
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('assignedDeliveryBoy');

    if (order) {
      const isOwner = order.user._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isAssignedDeliveryBoy =
        req.user.role === 'delivery_boy' &&
        order.assignedDeliveryBoy &&
        String(order.assignedDeliveryBoy._id || order.assignedDeliveryBoy) === String(req.user._id);

      if (isOwner || isAdmin || isAssignedDeliveryBoy) {
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
    const orders = await Order.find({ user: req.user._id })
      .populate('assignedDeliveryBoy')
      .sort({ createdAt: -1 });
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
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('assignedDeliveryBoy')
      .sort({ createdAt: -1 });
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
      order.liveTrackingEnabled = false;

      const updatedOrder = await order.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('orderStatusUpdated', {
          orderId: String(order._id),
          orderStatus: 'Delivered',
        });
        io.to(`order_${order._id}`).emit('trackingStopped', {
          orderId: String(order._id),
        });
      }
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
        order.liveTrackingEnabled = false;
      }

      const updatedOrder = await order.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`order_${order._id}`).emit('orderStatusUpdated', {
          orderId: String(order._id),
          orderStatus,
        });
        if (orderStatus === 'Delivered') {
          io.to(`order_${order._id}`).emit('trackingStopped', {
            orderId: String(order._id),
          });
        }
      }
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

// @desc    Assign delivery boy to an order and toggle live tracking
// @route   PUT /api/orders/:id/assign-delivery
// @access  Private/Admin
export const assignDeliveryBoyToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId, liveTrackingEnabled } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (deliveryBoyId) {
      const deliveryUser = await User.findById(deliveryBoyId).select('_id role name email phone');
      if (!deliveryUser) return res.status(400).json({ message: 'Invalid deliveryBoyId' });
      if (deliveryUser.role !== 'delivery_boy') {
        return res.status(400).json({ message: 'Selected user is not a delivery boy' });
      }

      order.assignedDeliveryBoy = deliveryUser._id;
      order.assignedAt = order.assignedAt || new Date();
      order.deliveryStartedAt = null;

      // Requirement: assignment moves order to Out for Delivery
      order.orderStatus = 'Out for Delivery';
    } else {
      order.assignedDeliveryBoy = null;
      order.assignedAt = null;
      order.deliveryStartedAt = null;
    }

    if (typeof liveTrackingEnabled === 'boolean') {
      if (liveTrackingEnabled === true && !order.assignedDeliveryBoy) {
        return res.status(400).json({ message: 'Assign a delivery boy before enabling tracking' });
      }

      order.liveTrackingEnabled = liveTrackingEnabled;
      if (liveTrackingEnabled) {
        order.trackingEnabledAt = order.trackingEnabledAt || new Date();
        order.trackingPausedAt = null;
      } else {
        order.trackingPausedAt = new Date();
      }
    }

    // If unassigned, tracking must be off.
    if (!order.assignedDeliveryBoy) {
      order.liveTrackingEnabled = false;
      order.trackingPausedAt = order.trackingPausedAt || new Date();
    }

    const updated = await order.save();
    const populated = await updated.populate('user', 'name email');
    await populated.populate('assignedDeliveryBoy');

    const io = req.app.get('io');
    if (io) {
      const roomLegacy = `order_${order._id}`;
      const roomSpec = `order:${order._id}`;

      io.to(roomLegacy).emit('orderAssignmentUpdated', {
        orderId: String(order._id),
        assignedDeliveryBoy: populated.assignedDeliveryBoy,
        liveTrackingEnabled: populated.liveTrackingEnabled,
      });

      io.to(roomSpec).emit('orderAssignmentUpdated', {
        orderId: String(order._id),
        assignedDeliveryBoy: populated.assignedDeliveryBoy,
        liveTrackingEnabled: populated.liveTrackingEnabled,
      });

      // Backward-compatible stop signal for clients
      if (!populated.liveTrackingEnabled) {
        io.to(roomLegacy).emit('trackingStopped', { orderId: String(order._id) });
        io.to(roomSpec).emit('trackingStopped', { orderId: String(order._id) });
      }
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery boy assigned orders
// @route   GET /api/orders/delivery/my-packages
// @access  Private/DeliveryBoy
export const getMyDeliveryOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedDeliveryBoy: req.user._id })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Start delivery for an assigned order
// @route   PUT /api/orders/:id/start-delivery
// @access  Private/DeliveryBoy
export const startDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.assignedDeliveryBoy || String(order.assignedDeliveryBoy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!order.deliveryStartedAt) {
      order.deliveryStartedAt = new Date();
    }
    order.orderStatus = 'Out for Delivery';
    order.liveTrackingEnabled = true;
    order.trackingEnabledAt = order.trackingEnabledAt || new Date();
    order.trackingPausedAt = null;

    const updated = await order.save();

    const io = req.app.get('io');
    if (io) {
      const roomLegacy = `order_${order._id}`;
      const roomSpec = `order:${order._id}`;

      io.to(roomLegacy).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: updated.orderStatus });
      io.to(roomSpec).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: updated.orderStatus });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark assigned order as delivered
// @route   PUT /api/orders/:id/mark-delivered
// @access  Private/DeliveryBoy
export const markDeliveredByDeliveryBoy = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.assignedDeliveryBoy || String(order.assignedDeliveryBoy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.orderStatus = 'Delivered';
    order.deliveredAt = Date.now();
    order.liveTrackingEnabled = false;
    order.trackingPausedAt = new Date();

    const updated = await order.save();

    const io = req.app.get('io');
    if (io) {
      const roomLegacy = `order_${order._id}`;
      const roomSpec = `order:${order._id}`;

      io.to(roomLegacy).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: 'Delivered' });
      io.to(roomSpec).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: 'Delivered' });

      io.to(roomLegacy).emit('trackingStopped', { orderId: String(order._id) });
      io.to(roomSpec).emit('trackingStopped', { orderId: String(order._id) });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pause/Resume live tracking (without changing assignment)
// @route   PUT /api/orders/:id/tracking
// @access  Private/Admin
export const setOrderTrackingEnabled = async (req, res) => {
  try {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled must be boolean' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email').populate('assignedDeliveryBoy');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (enabled === true && !order.assignedDeliveryBoy) {
      return res.status(400).json({ message: 'Assign a delivery boy before enabling tracking' });
    }

    order.liveTrackingEnabled = enabled;
    if (enabled) {
      order.trackingEnabledAt = order.trackingEnabledAt || new Date();
      order.trackingPausedAt = null;
    } else {
      order.trackingPausedAt = new Date();
    }

    const updated = await order.save();

    const io = req.app.get('io');
    if (io) {
      const roomLegacy = `order_${updated._id}`;
      const roomSpec = `order:${updated._id}`;

      io.to(roomLegacy).emit('orderAssignmentUpdated', {
        orderId: String(updated._id),
        assignedDeliveryBoy: updated.assignedDeliveryBoy,
        liveTrackingEnabled: updated.liveTrackingEnabled,
      });

      io.to(roomSpec).emit('orderAssignmentUpdated', {
        orderId: String(updated._id),
        assignedDeliveryBoy: updated.assignedDeliveryBoy,
        liveTrackingEnabled: updated.liveTrackingEnabled,
      });

      if (!updated.liveTrackingEnabled) {
        io.to(roomLegacy).emit('trackingStopped', { orderId: String(updated._id) });
        io.to(roomSpec).emit('trackingStopped', { orderId: String(updated._id) });
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate delivery tracking link (short-lived token)
// @route   POST /api/orders/:id/tracking-link
// @access  Private/Admin
export const generateDeliveryTrackingLink = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const { id } = req.params;
    const { deliveryBoyId } = req.body || {};

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const assigned = order.assignedDeliveryBoy ? String(order.assignedDeliveryBoy) : null;
    const chosen = deliveryBoyId ? String(deliveryBoyId) : assigned;

    if (!chosen) {
      return res.status(400).json({ message: 'No delivery boy assigned to this order' });
    }

    if (assigned && chosen !== assigned) {
      return res.status(400).json({ message: 'deliveryBoyId does not match assigned delivery boy for this order' });
    }

    const deliveryUser = await User.findById(chosen).select('_id role');
    if (!deliveryUser) return res.status(400).json({ message: 'Invalid deliveryBoyId' });
    if (deliveryUser.role !== 'delivery_boy') {
      return res.status(400).json({ message: 'Selected user is not a delivery boy' });
    }

    const token = jwt.sign(
      {
        type: 'delivery_tracking',
        orderId: String(order._id),
        deliveryBoyId: String(deliveryUser._id),
      },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    const frontendBase = getFrontendBaseUrl();
    const url = `${frontendBase}/delivery/track?orderId=${encodeURIComponent(String(order._id))}&deliveryBoyId=${encodeURIComponent(
      String(deliveryUser._id)
    )}&token=${encodeURIComponent(token)}`;

    res.json({ token, url, expiresInHours: 6 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get last known delivery location (in-memory store)
// @route   GET /api/orders/:id/tracking
// @access  Private (Order owner or Admin)
export const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('user assignedDeliveryBoy liveTrackingEnabled orderStatus');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?._id && String(order.user) === String(req.user._id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const last = await trackingStore.get(String(order._id));
    res.json({ orderId: String(order._id), lastKnownLocation: last });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
