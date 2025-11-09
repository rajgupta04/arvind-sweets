import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  stock: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  discount: { type: Number, default: 0 },
  weight: String,
  ingredients: [String],
  images: [String],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
