import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  // Only applicable for Fastfood category
  foodType: { type: String, enum: ['veg', 'nonveg'], required: false },
  stock: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  // Used to order featured products on homepage (1 = first). Lower comes first.
  featuredRank: { type: Number, default: null },
  // Used for Cart "Items you may like" recommendations
  isSuggested: { type: Boolean, default: false },
  // Lower comes first; missing values come last.
  suggestedRank: { type: Number, default: null },
  discount: { type: Number, default: 0 },
  weight: String,
  ingredients: [String],
  images: [String],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
