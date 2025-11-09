// Middleware to check if MongoDB is connected
import mongoose from 'mongoose';

export const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection is not available. Please check if MongoDB is running.',
      error: 'DATABASE_NOT_CONNECTED'
    });
  }
  next();
};

