import mongoose from "mongoose";

const pricingOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  // Optional alternative buying options (e.g., "1 kg", "1 pc")
  pricingOptions: { type: [pricingOptionSchema], default: [] },
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
  // Explicit cross-sell mapping: show these products when this product is in cart
  suggestedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  discount: { type: Number, default: 0 },
  weight: String,
  ingredients: [String],
  images: [String],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
