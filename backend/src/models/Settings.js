import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  deliveryBuffer: { type: Number, default: 10 }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
