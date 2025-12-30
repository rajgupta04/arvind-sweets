import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    ctaText: { type: String, default: '', trim: true },
    ctaLink: { type: String, default: '', trim: true },
    active: { type: Boolean, default: false },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
