// backend/src/config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

function redactMongoUri(uri) {
  const raw = String(uri || '').trim();
  if (!raw) return '';
  // Redact credentials between '//' and '@' (e.g. mongodb+srv://user:pass@host)
  return raw.replace(/(\/\/)([^@]+)(@)/, '$1***$3');
}

const connectDB = async () => {
  try {
    const safe = redactMongoUri(process.env.MONGO_URI);
    console.log("🔗 Connecting to MongoDB:", safe || '(env MONGO_URI not set)');
    const conn = await mongoose.connect(process.env.MONGO_URI); // ✅ this must be a string
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error; // Let the caller (server.js) handle it
  }
};

export default connectDB; 
