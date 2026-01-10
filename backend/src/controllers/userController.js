// User controller - business logic for user routes
import User from '../models/User.js';
import SweetCoinTransaction from '../models/SweetCoinTransaction.js';
import { generateToken } from '../utils/generateToken.js';
import mongoose from 'mongoose';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not connected. Please ensure MongoDB is running.' 
      });
    }

    const { name, email, password, phone } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sweetCoinBalance: Number(user.sweetCoinBalance) || 0,
        token: generateToken(user)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database not connected. Please ensure MongoDB is running.' 
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sweetCoinBalance: Number(user.sweetCoinBalance) || 0,
        token: generateToken(user)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      if (req.body.address) {
        user.address = { ...user.address, ...req.body.address };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
        sweetCoinBalance: Number(updatedUser.sweetCoinBalance) || 0
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by id (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create user (Admin)
// @route   POST /api/users
// @access  Private/Admin
export const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, role, sweetCoinBalance } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required' });
    }

    let parsedSweetCoinBalance;
    if (sweetCoinBalance !== undefined) {
      parsedSweetCoinBalance = Number(sweetCoinBalance);
      if (!Number.isFinite(parsedSweetCoinBalance) || !Number.isInteger(parsedSweetCoinBalance)) {
        return res.status(400).json({ message: 'sweetCoinBalance must be an integer' });
      }
      if (parsedSweetCoinBalance < 0) {
        return res.status(400).json({ message: 'sweetCoinBalance must be >= 0' });
      }
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: password ? String(password) : undefined,
      phone: phone ? String(phone).trim() : undefined,
      role: role || undefined,
      ...(parsedSweetCoinBalance !== undefined ? { sweetCoinBalance: parsedSweetCoinBalance } : {}),
    });

    if (parsedSweetCoinBalance !== undefined && parsedSweetCoinBalance > 0) {
      try {
        await SweetCoinTransaction.create({
          user: user._id,
          amount: parsedSweetCoinBalance,
          kind: 'admin_gift',
          note: 'Gifted by admin',
          createdBy: req.user?._id || null,
        });
      } catch (e) {
        console.warn('Failed to create SweetCoinTransaction for admin createUser', e);
      }
    }

    const safe = await User.findById(user._id).select('-password');
    res.status(201).json(safe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone, role, password, sweetCoinBalance } = req.body || {};

    const previousSweetCoinBalance = Math.max(0, Math.floor(Number(user.sweetCoinBalance) || 0));
    let sweetCoinDelta = 0;

    if (sweetCoinBalance !== undefined) {
      const parsed = Number(sweetCoinBalance);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return res.status(400).json({ message: 'sweetCoinBalance must be an integer' });
      }
      if (parsed < 0) {
        return res.status(400).json({ message: 'sweetCoinBalance must be >= 0' });
      }
      user.sweetCoinBalance = parsed;
      sweetCoinDelta = Math.trunc(parsed) - previousSweetCoinBalance;
    }

    if (email && String(email).toLowerCase().trim() !== String(user.email).toLowerCase()) {
      const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existing && String(existing._id) !== String(user._id)) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = String(email).toLowerCase().trim();
    }

    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = phone ? String(phone).trim() : '';
    if (role !== undefined) user.role = role;
    if (password !== undefined && String(password).trim() !== '') {
      user.password = String(password);
      user.isGoogleUser = false;
    }

    const updated = await user.save();

    if (sweetCoinBalance !== undefined && sweetCoinDelta !== 0) {
      try {
        await SweetCoinTransaction.create({
          user: updated._id,
          amount: sweetCoinDelta,
          kind: sweetCoinDelta > 0 ? 'admin_gift' : 'admin_adjustment',
          note: sweetCoinDelta > 0 ? 'Gifted by admin' : 'Adjusted by admin',
          createdBy: req.user?._id || null,
        });
      } catch (e) {
        console.warn('Failed to create SweetCoinTransaction for admin updateUser', e);
      }
    }

    const safe = await User.findById(updated._id).select('-password');
    res.json(safe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery boy users (Admin)
// @route   GET /api/users/delivery-boys
// @access  Private/Admin
export const getDeliveryBoyUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'delivery_boy' })
      .select('_id name email phone role')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
