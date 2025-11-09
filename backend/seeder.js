import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "./src/models/Product.js";
import { sweetsData } from "./src/data/sweetsData.js";
import connectDB from "./src/config/db.js";

dotenv.config();

const importData = async () => {
  try {
    await connectDB();
    await Product.deleteMany();
    await Product.insertMany(sweetsData);
    console.log("✅ Sweets Data Imported!");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

importData();
