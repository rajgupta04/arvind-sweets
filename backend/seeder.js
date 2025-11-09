import mongoose from "mongoose";
import dotenv from "dotenv";
import { sweetsData } from "./src/data/sweetsData.js";
import Product from "./src/models/productModel.js";
import connectDB from "./src/config/db.js";

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Product.deleteMany();
    await Product.insertMany(sweetsData);
    console.log("✅ Data Imported Successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error importing data:", error);
    process.exit(1);
  }
};

importData();
