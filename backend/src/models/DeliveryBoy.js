import mongoose from 'mongoose';

const deliveryBoySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

deliveryBoySchema.index({ phone: 1 }, { unique: true });

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);

export default DeliveryBoy;
