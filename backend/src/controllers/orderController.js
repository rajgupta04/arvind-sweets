// Order controller - business logic for order routes
import Order from '../models/Order.js';
import DeliveryBoy from '../models/DeliveryBoy.js';
import jwt from 'jsonwebtoken';
import { notifyOwner, notifyOwnerForOrderCancellation } from '../utils/notifyOwner.js';
import { sendOrderEmail } from '../utils/sendEmail.js';
// ETA via haversine-based calculation will be computed inline in createOrder
import Settings from '../models/Settings.js';
import { trackingStore } from '../utils/trackingStore.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import {
  getAdminWhatsAppTo,
  getWhatsAppDefaultCountryCode,
  isWhatsAppCloudEnabled,
  normalizeWhatsAppCloudTo,
  sendWhatsAppCloudDeliveryAssigned,
  sendWhatsAppCloudOrderCancelled,
  sendWhatsAppCloudOrderPlaced,
} from '../utils/whatsappCloud.js';
import {
  normalizeCouponCode,
  validateCouponOrThrow,
  recordCouponUsage,
} from '../utils/couponUtils.js';

const DEFAULT_DELIVERY_CHARGE = 50;
const FREE_DELIVERY_THRESHOLD = 250;

function haversineDistanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function timeToMinutes(hhmm) {
  const m = String(hhmm || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function nowMinutesInTimeZone(timeZone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const min = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
  } catch {
    return null;
  }
}

function isNowInWindow(nowMin, startMin, endMin) {
  if (nowMin == null || startMin == null || endMin == null) return false;
  if (startMin === endMin) return true;
  // Same-day window
  if (endMin > startMin) return nowMin >= startMin && nowMin < endMin;
  // Overnight window (e.g., 22:00 -> 02:00)
  return nowMin >= startMin || nowMin < endMin;
}

function pickActiveRangeRule(deliveryRange) {
  const tz = deliveryRange?.timezone || 'Asia/Kolkata';
  const nowMin = nowMinutesInTimeZone(tz);
  const rules = Array.isArray(deliveryRange?.rules) ? deliveryRange.rules : [];
  for (const r of rules) {
    const s = timeToMinutes(r?.startTime);
    const e = timeToMinutes(r?.endTime);
    if (isNowInWindow(nowMin, s, e)) return r;
  }
  return null;
}

function computeRangeDeliveryCharge({ itemsPrice, distanceKm, rule, rounding }) {
  const includedKm = Number(rule?.includedKm) || 0;
  const freeAboveAmount = Number(rule?.freeAboveAmount) || 0;
  const perKmCharge = Number(rule?.perKmCharge) || 0;

  if (itemsPrice >= freeAboveAmount) return 0;
  const extraKm = Math.max(0, distanceKm - includedKm);
  if (extraKm <= 0) return 0;

  const extra = rounding === 'exact' ? extraKm : Math.ceil(extraKm);
  const charge = extra * perKmCharge;
  return Math.max(0, Math.round(charge));
}

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
      couponCode,
      paymentStatus,
      userLatitude,
      userLongitude
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // Load settings (used for delivery range + cart goals)
    let settingsForRange = null;
    try {
      settingsForRange = await Settings.findOne();
    } catch {}

    // Compute prices server-side (do not trust client totals)
    const ids = Array.isArray(orderItems) ? orderItems.map((i) => i?.product).filter(Boolean) : [];
    const products = await Product.find({ _id: { $in: ids } }).select('name price discount images pricingOptions');
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const goals = settingsForRange?.cartGoals || {};
    const giftEnabled = Boolean(goals?.freeGift?.enabled);
    const giftThreshold = Number(goals?.freeGift?.threshold) || 0;
    const giftMaxItems = Math.max(1, Math.min(5, Number(goals?.freeGift?.maxItems) || 1));
    const giftBucket = Array.isArray(goals?.freeGift?.bucket) ? goals.freeGift.bucket.map((x) => String(x)) : [];
    const giftBucketSet = new Set(giftBucket);

    let computedPaidItemsPrice = 0;
    let computedItemsPrice = 0;
    let giftCount = 0;

    const normalizedOrderItems = (Array.isArray(orderItems) ? orderItems : []).map((i) => {
      const productId = String(i?.product || '');
      const prod = byId.get(productId);
      if (!prod) {
        const err = new Error('One or more products are not available');
        err.statusCode = 400;
        throw err;
      }

      const isGift = i?.isGift === true;

      const qty = Number(i?.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        const err = new Error('Invalid item quantity');
        err.statusCode = 400;
        throw err;
      }

      if (isGift) {
        giftCount += 1;
        if (qty !== 1) {
          const err = new Error('Gift item quantity must be 1');
          err.statusCode = 400;
          throw err;
        }
        if (giftCount > giftMaxItems) {
          const err = new Error('Too many gift items');
          err.statusCode = 400;
          throw err;
        }
        if (!giftEnabled) {
          const err = new Error('Gift items are not enabled');
          err.statusCode = 400;
          throw err;
        }
        if (!giftBucketSet.has(productId)) {
          const err = new Error('Selected gift item is not available');
          err.statusCode = 400;
          throw err;
        }

        // Price for gift line is always 0 (validated server-side)
        const unitPrice = 0;
        computedItemsPrice += unitPrice * qty;
        return {
          product: prod._id,
          name: i?.name || prod.name,
          price: unitPrice,
          quantity: qty,
          image: i?.image,
          isGift: true,
        };
      }

      let basePrice = Number(prod.price) || 0;
      let resolvedOptionLabel = '';
      const pricingOptionId = i?.pricingOptionId ? String(i.pricingOptionId).trim() : '';
      const pricingOptionLabelRaw = i?.pricingOptionLabel ? String(i.pricingOptionLabel).trim() : '';
      if (pricingOptionId || pricingOptionLabelRaw) {
        const options = Array.isArray(prod.pricingOptions) ? prod.pricingOptions : [];
        const opt = pricingOptionId
          ? options.find((x) => String(x?._id) === pricingOptionId)
          : options.find((x) => String(x?.label || '').trim().toLowerCase() === pricingOptionLabelRaw.toLowerCase());

        if (!opt) {
          const err = new Error('Invalid buying option selected');
          err.statusCode = 400;
          throw err;
        }

        const optPrice = Number(opt.price);
        if (!Number.isFinite(optPrice) || optPrice < 0) {
          const err = new Error('Invalid buying option price');
          err.statusCode = 400;
          throw err;
        }

        basePrice = optPrice;
        resolvedOptionLabel = String(opt.label || '').trim();
      }
      const disc = Number(prod.discount) || 0;
      const unit = disc > 0 ? basePrice - (basePrice * disc) / 100 : basePrice;
      const unitPrice = Math.round(unit * 100) / 100;
      computedPaidItemsPrice += unitPrice * qty;
      computedItemsPrice += unitPrice * qty;

      const optionLabelRaw = pricingOptionLabelRaw;
      const optionLabel = optionLabelRaw || resolvedOptionLabel;
      const displayName = optionLabel ? `${prod.name} (${optionLabel})` : (i?.name || prod.name);

      return {
        product: prod._id,
        name: displayName,
        price: unitPrice,
        quantity: qty,
        image: i?.image,
      };
    });

    if (giftCount > 0) {
      if (!giftEnabled) {
        return res.status(400).json({ message: 'Gift items are not enabled' });
      }
      if (computedPaidItemsPrice + 1e-6 < giftThreshold) {
        return res.status(400).json({ message: `Gift unlock requires minimum ₹${giftThreshold}` });
      }
    }

    computedItemsPrice = Math.round(computedItemsPrice * 100) / 100;

    // Validate required delivery fields
    if (deliveryType === 'Delivery') {
      const phone = String(shippingAddress?.phone || '').trim();
      const street = String(shippingAddress?.street || '').trim();
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required for delivery' });
      }
      if (!street) {
        return res.status(400).json({ message: 'Address line 1 is required for delivery' });
      }

      const loc = shippingAddress?.location;
      const uLat = typeof userLatitude === 'number' ? userLatitude : loc?.lat;
      const uLng = typeof userLongitude === 'number' ? userLongitude : loc?.lng;
      if (typeof uLat !== 'number' || typeof uLng !== 'number') {
        return res.status(400).json({ message: 'Location is required. Please enable GPS / pick location on map.' });
      }
    }

    // Compute delivery charge using settings (range rules) if enabled
    const deliveryRangeEnabled = Boolean(settingsForRange?.deliveryRange?.enabled);
    const DELIVERY_UNAVAILABLE_MESSAGE = "Sorry, we aren't available in your area. Contact store for more information.";
    let computedDeliveryCharge = 0;
    let computedDistanceKm = null;

    if (deliveryType === 'Delivery') {
      const SHOP_LAT = Number(process.env.SHOP_LAT);
      const SHOP_LNG = Number(process.env.SHOP_LNG);
      const loc = shippingAddress?.location;
      const uLat = typeof userLatitude === 'number' ? userLatitude : loc?.lat;
      const uLng = typeof userLongitude === 'number' ? userLongitude : loc?.lng;

      if (
        typeof SHOP_LAT === 'number' && !Number.isNaN(SHOP_LAT) &&
        typeof SHOP_LNG === 'number' && !Number.isNaN(SHOP_LNG) &&
        typeof uLat === 'number' && typeof uLng === 'number'
      ) {
        computedDistanceKm = Number(haversineDistanceKm(SHOP_LAT, SHOP_LNG, uLat, uLng).toFixed(2));
      }

      if (deliveryRangeEnabled) {
        if (computedDistanceKm == null) {
          return res.status(400).json({ message: 'Unable to compute delivery distance. Please reselect your location.' });
        }

        const rule = pickActiveRangeRule(settingsForRange.deliveryRange);
        if (!rule) {
          return res.status(400).json({ message: DELIVERY_UNAVAILABLE_MESSAGE });
        }

        const maxKm = Number(rule?.maxKm);
        if (Number.isFinite(maxKm) && computedDistanceKm > maxKm + 1e-6) {
          return res.status(400).json({ message: DELIVERY_UNAVAILABLE_MESSAGE });
        }

        computedDeliveryCharge = computeRangeDeliveryCharge({
          itemsPrice: computedItemsPrice,
          distanceKm: computedDistanceKm,
          rule,
          rounding: settingsForRange?.deliveryRange?.rounding || 'ceil',
        });
      } else {
        // Legacy flat delivery charge behavior
        computedDeliveryCharge = computedItemsPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_DELIVERY_CHARGE;
      }
    }

    let couponDoc = null;
    let couponSnapshot = { code: '', discountType: 'flat', discountValue: 0, discountAmount: 0 };
    let discountAmount = 0;

    if (couponCode) {
      const normalized = normalizeCouponCode(couponCode);
      couponDoc = await Coupon.findOne({ code: normalized });
      if (!couponDoc) {
        return res.status(400).json({ message: 'Invalid coupon code' });
      }
      try {
        const result = validateCouponOrThrow({
          coupon: couponDoc,
          itemsPrice: computedItemsPrice,
          userId: req.user?._id,
        });
        discountAmount = result.discountAmount;
        couponSnapshot = {
          code: couponDoc.code,
          discountType: couponDoc.discountType,
          discountValue: couponDoc.discountValue,
          discountAmount,
        };
      } catch (e) {
        return res.status(e.statusCode || 400).json({ message: e.message || 'Coupon is not valid' });
      }
    }

    const computedTotalPrice = Math.max(0, Math.round((computedItemsPrice + computedDeliveryCharge - discountAmount) * 100) / 100);

    const orderData = {
      user: req.user._id,
      orderItems: normalizedOrderItems,
      shippingAddress,
      paymentMethod,
      deliveryType,
      itemsPrice: computedItemsPrice,
      deliveryCharge: computedDeliveryCharge,
      coupon: couponSnapshot,
      totalPrice: computedTotalPrice,
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
        const distanceKm = computedDistanceKm != null
          ? computedDistanceKm
          : Number(haversineDistanceKm(SHOP_LAT, SHOP_LNG, uLat, uLng).toFixed(2));

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

    // Record coupon usage only after order is created
    if (couponDoc && discountAmount > 0) {
      try {
        await recordCouponUsage({ couponId: couponDoc._id, userId: req.user._id });
      } catch (e) {
        console.warn('Coupon usage recording failed:', e?.message || e);
      }
    }

    notifyOwner(populatedOrder);
    sendOrderEmail(populatedOrder);

    // WhatsApp Cloud API (Meta test number) notifications (optional)
    if (isWhatsAppCloudEnabled()) {
      const defaultCC = getWhatsAppDefaultCountryCode();
      const adminRaw = getAdminWhatsAppTo();
      const userRaw = populatedOrder?.shippingAddress?.phone;

      const adminTo = normalizeWhatsAppCloudTo(adminRaw, { defaultCountryCode: defaultCC });
      const userTo = normalizeWhatsAppCloudTo(userRaw, { defaultCountryCode: defaultCC });

      if (adminTo) {
        sendWhatsAppCloudOrderPlaced({ order: populatedOrder, to: adminTo, audience: 'admin' })
          .then((r) => {
            if (!r?.ok) {
              const msg = r?.data?.error?.message || r?.data?.error?.error_user_msg || 'unknown';
              console.error('❌ WhatsApp Cloud send failed (admin order placed):', r?.status || '', msg);
            }
          })
          .catch((e) => console.error('❌ WhatsApp Cloud send crashed (admin order placed):', e?.message || e));
      }
      if (userTo) {
        sendWhatsAppCloudOrderPlaced({ order: populatedOrder, to: userTo, audience: 'user' })
          .then((r) => {
            if (!r?.ok) {
              const msg = r?.data?.error?.message || r?.data?.error?.error_user_msg || 'unknown';
              console.error('❌ WhatsApp Cloud send failed (user order placed):', r?.status || '', msg);
            }
          })
          .catch((e) => console.error('❌ WhatsApp Cloud send crashed (user order placed):', e?.message || e));
      }
    }

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
      .populate('assignedDeliveryBoy')
      .populate({ path: 'cancellation.cancelledBy', select: 'name email role' });

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

// @desc    Rate an order (two ratings: order + delivery)
// @route   POST /api/orders/:id/ratings
// @access  Private
export const rateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isOwner = String(order.user) === String(req.user?._id);
    if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

    if (String(order.orderStatus) !== 'Delivered') {
      return res.status(400).json({ message: 'You can rate only after delivery' });
    }

    const toInt = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.round(n);
    };

    const orderRating = toInt(req.body?.orderRating);
    const deliveryRating = toInt(req.body?.deliveryRating);

    if (![1, 2, 3, 4, 5].includes(orderRating) || ![1, 2, 3, 4, 5].includes(deliveryRating)) {
      return res.status(400).json({ message: 'Ratings must be numbers from 1 to 5' });
    }

    const alreadyRated =
      typeof order?.ratings?.order === 'number' || typeof order?.ratings?.delivery === 'number';
    if (alreadyRated) {
      return res.status(400).json({ message: 'Order already rated' });
    }

    order.ratings = {
      order: orderRating,
      delivery: deliveryRating,
      ratedAt: new Date(),
    };

    await order.save();

    // Update delivery boy profile aggregate rating (best-effort)
    try {
      const deliveryBoyUserId = order.assignedDeliveryBoy ? String(order.assignedDeliveryBoy) : null;
      if (deliveryBoyUserId) {
        const deliveryUser = await User.findById(deliveryBoyUserId).select('role deliveryRatings');
        if (deliveryUser && deliveryUser.role === 'delivery_boy') {
          const prevCount = Number(deliveryUser.deliveryRatings?.count || 0);
          const prevSum = Number(deliveryUser.deliveryRatings?.sum || 0);
          const nextCount = prevCount + 1;
          const nextSum = prevSum + deliveryRating;
          const nextAvg = Math.round((nextSum / nextCount) * 100) / 100;
          deliveryUser.deliveryRatings = { avg: nextAvg, count: nextCount, sum: nextSum };
          await deliveryUser.save();
        }
      }
    } catch (e) {
      console.warn('Delivery boy rating aggregate update failed:', e?.message || e);
    }

    return res.status(200).json({ ratings: order.ratings });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save rating' });
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
      .populate({ path: 'cancellation.cancelledBy', select: 'name email role' })
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

// @desc    Cancel an order with reason
// @route   POST /api/orders/:id/cancel
// @access  Private (Owner/Admin)
export const cancelOrder = async (req, res) => {
  try {
    const { reasonKey, reasonLabel, message } = req.body || {};

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isOwner = String(order.user) === String(req.user?._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const status = String(order.orderStatus || '').trim();
    if (status === 'Delivered') return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    if (status === 'Cancelled') return res.status(400).json({ message: 'Order already cancelled' });
    if (status === 'Out for Delivery') {
      return res.status(400).json({ message: 'Order cannot be cancelled once out for delivery' });
    }

    const key = String(reasonKey || '').trim().toLowerCase();
    const label = String(reasonLabel || '').trim();
    const msg = String(message || '').trim();

    if (!key || !label) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }
    if (key === 'other' && msg.length < 3) {
      return res.status(400).json({ message: 'Please enter a reason' });
    }

    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    order.liveTrackingEnabled = false;
    order.cancellation = {
      reasonKey: key,
      reasonLabel: label,
      message: key === 'other' ? msg : '',
      cancelledBy: req.user?._id || null,
    };

    const updatedOrder = await order.save();

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate('assignedDeliveryBoy', 'name phone')
      .populate({ path: 'cancellation.cancelledBy', select: 'name email role' });

    const io = req.app.get('io');
    if (io) {
      const roomLegacy = `order_${order._id}`;
      const roomSpec = `order:${String(order._id)}`;

      io.to(roomLegacy).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: 'Cancelled' });
      io.to(roomSpec).emit('orderStatusUpdated', { orderId: String(order._id), orderStatus: 'Cancelled' });

      io.to(roomLegacy).emit('trackingStopped', { orderId: String(order._id) });
      io.to(roomSpec).emit('trackingStopped', { orderId: String(order._id) });

      // Admin-wide notification channel
      io.to('admins').emit('adminOrderCancelled', {
        order: populatedOrder?.toObject ? populatedOrder.toObject({ virtuals: false }) : populatedOrder,
      });
    }

    // Store-owner WhatsApp notification (optional)
    notifyOwnerForOrderCancellation(populatedOrder || updatedOrder);

    // WhatsApp Cloud API (Meta test number) notifications (optional)
    if (isWhatsAppCloudEnabled()) {
      const defaultCC = getWhatsAppDefaultCountryCode();
      const adminRaw = getAdminWhatsAppTo();
      const userRaw = populatedOrder?.shippingAddress?.phone;
      const deliveryRaw = populatedOrder?.assignedDeliveryBoy?.phone;

      const adminTo = normalizeWhatsAppCloudTo(adminRaw, { defaultCountryCode: defaultCC });
      const userTo = normalizeWhatsAppCloudTo(userRaw, { defaultCountryCode: defaultCC });
      const deliveryTo = normalizeWhatsAppCloudTo(deliveryRaw, { defaultCountryCode: defaultCC });

      if (adminTo) {
        sendWhatsAppCloudOrderCancelled({ order: populatedOrder || updatedOrder, to: adminTo, audience: 'admin' }).catch((e) =>
          console.error('❌ WhatsApp Cloud send failed (admin order cancelled):', e?.message || e)
        );
      }
      if (userTo) {
        sendWhatsAppCloudOrderCancelled({ order: populatedOrder || updatedOrder, to: userTo, audience: 'user' }).catch((e) =>
          console.error('❌ WhatsApp Cloud send failed (user order cancelled):', e?.message || e)
        );
      }
      if (deliveryTo) {
        sendWhatsAppCloudOrderCancelled({ order: populatedOrder || updatedOrder, to: deliveryTo, audience: 'delivery_boy' }).catch((e) =>
          console.error('❌ WhatsApp Cloud send failed (delivery order cancelled):', e?.message || e)
        );
      }
    }

    return res.json(populatedOrder || updatedOrder);
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
    await populated.populate('assignedDeliveryBoy', 'name phone');

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

    // WhatsApp Cloud API (Meta test number) notification to delivery boy (optional)
    if (isWhatsAppCloudEnabled() && populated?.assignedDeliveryBoy?.phone) {
      const defaultCC = getWhatsAppDefaultCountryCode();
      const deliveryTo = normalizeWhatsAppCloudTo(populated.assignedDeliveryBoy.phone, { defaultCountryCode: defaultCC });
      if (deliveryTo) {
        sendWhatsAppCloudDeliveryAssigned({
          order: populated,
          deliveryBoy: populated.assignedDeliveryBoy,
          to: deliveryTo,
        }).catch((e) => console.error('❌ WhatsApp Cloud send failed (delivery assigned):', e?.message || e));
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
