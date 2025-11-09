// backend/src/server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";
import app from "./app.js";

// ✅ Load .env safely from backend root no matter where command is run
dotenv.config({ path: path.resolve(process.cwd(), "./backend/.env") });

// 🧠 Debugging log
console.log("MONGO_URI:", process.env.MONGO_URI);

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found. Check .env file path or dotenv.config()");
  process.exit(1);
}

// ✅ Connect to database first
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
