// Order Mongoose schema
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  price: Number,
  isGift: { type: Boolean, default: false },
  pricingOptionId: { type: mongoose.Schema.Types.ObjectId, required: false, default: null },
  pricingOptionLabel: { type: String, default: '' },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: String
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  orderItems: [orderItemSchema],
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    location: {
      lat: Number,
      lng: Number
    }
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Pickup'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  deliveryType: {
    type: String,
    enum: ['Delivery', 'Pickup'],
    default: 'Delivery'
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0
  },
  deliveryCharge: {
    type: Number,
    default: 0
  },
  coupon: {
    code: { type: String, default: '' },
    discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
  },

  // SweetCoin reward & redemption
  sweetCoinPercent: { type: Number, default: 10 },
  sweetCoinEarned: { type: Number, default: 0 },
  sweetCoinStatus: { type: String, enum: ['none', 'pending', 'credited'], default: 'none' },
  sweetCoinCreditedAt: { type: Date, default: null },

  sweetCoinUsed: { type: Number, default: 0 },
  sweetCoinUsedAt: { type: Date, default: null },
  sweetCoinRefundedAt: { type: Date, default: null },
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  },
  distanceKm: Number,
  travelTimeMin: Number,
  eta: Date,
  estimatedDelivery: { type: Date },
  deliveryBuffer: { type: Number, default: 10 },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Placed', 'Preparing', 'Out for Delivery'],
    default: 'Pending'
  },
  assignedDeliveryBoy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  deliveryStartedAt: {
    type: Date,
    default: null
  },
  liveTrackingEnabled: {
    type: Boolean,
    default: false
  },
  trackingEnabledAt: {
    type: Date,
    default: null
  },
  trackingPausedAt: {
    type: Date,
    default: null
  },
  lastDeliveryLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  // New name (kept in sync with lastDeliveryLocation)
  lastKnownLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: Date,
  deliveredAt: Date,
  cancelledAt: { type: Date, default: null },
  cancellation: {
    reasonKey: { type: String, default: '' },
    reasonLabel: { type: String, default: '' },
    message: { type: String, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  ratings: {
    order: { type: Number, min: 1, max: 5, default: null },
    delivery: { type: Number, min: 1, max: 5, default: null },
    ratedAt: { type: Date, default: null },
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
