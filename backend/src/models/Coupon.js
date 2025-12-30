import mongoose from 'mongoose';

const couponUserUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },

    discountType: {
      type: String,
      enum: ['flat', 'percent'],
      required: true,
      default: 'flat',
    },
    discountValue: { type: Number, required: true, min: 0 },

    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null },

    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },

    // When enabled, this coupon is eligible to be shown as a one-time popup after login.
    showOnLoginPopup: { type: Boolean, default: false },

    usageLimit: { type: Number, default: null }, // total uses across all users
    perUserLimit: { type: Number, default: 1 },

    usageCount: { type: Number, default: 0 },
    userUsages: { type: [couponUserUsageSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
