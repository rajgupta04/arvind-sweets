import mongoose from 'mongoose';

const deliveryRangeRuleSchema = new mongoose.Schema(
  {
    startTime: { type: String, default: '09:00' }, // HH:MM (24h)
    endTime: { type: String, default: '19:00' }, // HH:MM (24h)
    includedKm: { type: Number, default: 3 }, // distance included for free/flat charge
    maxKm: { type: Number, default: 6 }, // hard cutoff distance
    freeAboveAmount: { type: Number, default: 500 }, // itemsPrice >= this => delivery free
    perKmCharge: { type: Number, default: 15 }, // charge per km beyond includedKm
  },
  { _id: true }
);

const deliveryRangeSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'Asia/Kolkata' },
    rounding: { type: String, enum: ['ceil', 'exact'], default: 'ceil' },
    rules: {
      type: [deliveryRangeRuleSchema],
      default: () => [
        { startTime: '09:00', endTime: '19:00', includedKm: 3, maxKm: 6, freeAboveAmount: 500, perKmCharge: 15 },
        { startTime: '19:00', endTime: '21:00', includedKm: 3, maxKm: 3, freeAboveAmount: 500, perKmCharge: 15 },
      ],
    },
  },
  { _id: false }
);

const cartGoalsSchema = new mongoose.Schema(
  {
    freeDelivery: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 250 },
    },
    freeGift: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 500 },
      bucket: {
        type: [
          new mongoose.Schema(
            {
              product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
              pricingOptionId: { type: mongoose.Schema.Types.ObjectId, required: false },
            },
            { _id: true }
          ),
        ],
        default: [],
      },
      maxItems: { type: Number, default: 1 },
    },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema({
  deliveryBuffer: { type: Number, default: 10 },
  deliveryRange: { type: deliveryRangeSchema, default: () => ({}) },
  // UI toggles
  showProductQuantity: { type: Boolean, default: true },
  // Cart progress goals
  cartGoals: { type: cartGoalsSchema, default: () => ({}) },
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
