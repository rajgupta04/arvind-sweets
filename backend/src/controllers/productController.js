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
      const { category, featured, search } = req.query;
      console.log('Query params:', { category, featured, search });
      
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }
      if (featured === 'true') {
        filteredProducts = filteredProducts.filter(p => p.isFeatured);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      console.log('Returning', filteredProducts.length, 'products');
      return res.json(filteredProducts);
    }

    const { category, search, minPrice, maxPrice, featured } = req.query;
    const query = {};

    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
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

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
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
    const product = new Product(req.body);
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
      Object.assign(product, req.body);
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
