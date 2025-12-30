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
    required: true
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
  deliveredAt: Date
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
