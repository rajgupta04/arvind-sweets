// MongoDB configuration
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arvind-sweets');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Server will continue to run, but database operations will fail.');
    console.error('Please ensure MongoDB is running or set MONGODB_URI in .env file');
    // Don't exit in development - allow server to start for testing
    // process.exit(1);
  }
};

export default connectDB;
