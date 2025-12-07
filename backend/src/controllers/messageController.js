import Message from '../models/Message.js';
import mongoose from 'mongoose';
// import { notifyOwnerForMessage } from '../utils/notifyOwner.js';

export const createMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    const doc = await Message.create({ name, email, phone, subject, message });

    // Optionally notify via WhatsApp (enable if desired)
    // await notifyOwnerForMessage(doc);

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

