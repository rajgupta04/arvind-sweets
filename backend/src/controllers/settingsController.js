import Settings from '../models/Settings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ deliveryBuffer: 10 });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { deliveryBuffer } = req.body;
    const value = Number(deliveryBuffer);
    if (Number.isNaN(value) || value < 5 || value > 30) {
      return res.status(400).json({ message: 'deliveryBuffer must be between 5 and 30 minutes' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ deliveryBuffer: value });
    } else {
      settings.deliveryBuffer = value;
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
