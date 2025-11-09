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
    pincode: String
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Pickup'],
    required: true
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
  orderStatus: {
    type: String,
    enum: ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Placed'
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
