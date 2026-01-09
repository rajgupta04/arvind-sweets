// Product controller - business logic for product routes
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Import products data
import { sweetsData } from '../data/sweetsData.js';

// Generate sample products with IDs for fallback when DB is not connected
const sampleProducts = sweetsData.map((sweet, index) => ({
  _id: String(index + 1),
  ...sweet
}));

const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

const toNumberOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeProductBody = (body = {}) => {
  const normalized = { ...body };

  if ('isAvailable' in normalized) normalized.isAvailable = toBool(normalized.isAvailable);
  if ('isFeatured' in normalized) normalized.isFeatured = toBool(normalized.isFeatured);
  if ('isSuggested' in normalized) normalized.isSuggested = toBool(normalized.isSuggested);

  if ('price' in normalized) {
    const price = Number(normalized.price);
    if (Number.isFinite(price)) normalized.price = price;
  }
  if ('stock' in normalized) {
    const stock = Number(normalized.stock);
    if (Number.isFinite(stock)) normalized.stock = stock;
  }
  if ('discount' in normalized) {
    const discount = Number(normalized.discount);
    if (Number.isFinite(discount)) normalized.discount = discount;
  }

  if ('featuredRank' in normalized) normalized.featuredRank = toNumberOrNull(normalized.featuredRank);
  if (normalized.isFeatured !== true) normalized.featuredRank = null;

  const toObjectIdStrings = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => (typeof x === 'string' ? x.trim() : String(x || '').trim()))
      .filter(Boolean)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
  };

  if ('suggestedWith' in normalized) {
    const ids = toObjectIdStrings(normalized.suggestedWith);
    normalized.suggestedWith = Array.from(new Set(ids));
  }

  if (normalized.isSuggested !== true) {
    normalized.suggestedWith = [];
  }

  if (normalized.category !== 'Fastfood') {
    delete normalized.foodType;
  } else {
    if (normalized.foodType === '' || normalized.foodType === null || normalized.foodType === undefined) {
      delete normalized.foodType;
    }
  }

  return normalized;
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning sample data');
      let filteredProducts = [...sampleProducts];
      
      // Apply basic filters to sample data
      const { category, featured, suggested, search, foodType } = req.query;
      console.log('Query params:', { category, featured, suggested, search, foodType });
      
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }
      if (foodType) {
        filteredProducts = filteredProducts.filter(p => p.foodType === foodType);
      }
      if (featured === 'true') {
        filteredProducts = filteredProducts.filter(p => p.isFeatured);
      }
      if (suggested === 'true') {
        filteredProducts = filteredProducts.filter(p => p.isSuggested);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      // Featured ranking: order by featuredRank asc (missing last), then createdAt desc
      if (featured === 'true') {
        filteredProducts.sort((a, b) => {
          const ar = Number.isFinite(Number(a.featuredRank)) ? Number(a.featuredRank) : 9999;
          const br = Number.isFinite(Number(b.featuredRank)) ? Number(b.featuredRank) : 9999;
          if (ar !== br) return ar - br;

          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
      }

      // Suggested products: no rank-based ordering

      console.log('Returning', filteredProducts.length, 'products');
      return res.json(filteredProducts);
    }

    const { category, search, minPrice, maxPrice, featured, suggested, foodType } = req.query;
    const query = {};

    if (category) query.category = category;
    if (foodType) query.foodType = foodType;
    if (featured === 'true') query.isFeatured = true;
    if (suggested === 'true') query.isSuggested = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (featured === 'true') {
      const products = await Product.aggregate([
        { $match: query },
        { $addFields: { _featuredRankSort: { $ifNull: ['$featuredRank', 9999] } } },
        { $sort: { _featuredRankSort: 1, createdAt: -1 } },
        { $project: { _featuredRankSort: 0 } },
      ]);
      return res.json(products);
    }

    if (suggested === 'true') {
      const products = await Product.find(query).sort({ createdAt: -1 });
      return res.json(products);
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return sample data on error
    res.json(sampleProducts);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning sample data');
      const sample = sampleProducts.find(p => p._id === req.params.id);
      if (sample) {
        return res.json(sample);
      }
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    const sample = sampleProducts.find(p => p._id === req.params.id);
    if (sample) {
      return res.json(sample);
    }
    res.status(404).json({ message: 'Product not found' });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const product = new Product(normalizeProductBody(req.body));
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      Object.assign(product, normalizeProductBody(req.body));
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: product._id });
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
