// backend/src/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async () => {
  try {
    console.log("🔗 Connecting to MongoDB using:", process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI); // ✅ this must be a string
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error; // Let the caller (server.js) handle it
  }
};

export default connectDB; 
