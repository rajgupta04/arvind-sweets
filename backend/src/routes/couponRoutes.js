import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getPopupCoupon,
} from '../controllers/couponController.js';

const router = express.Router();

// User routes
router.get('/popup', protect, getPopupCoupon);
router.post('/validate', protect, validateCoupon);

// Admin routes
router.get('/', protect, admin, listCoupons);
router.post('/', protect, admin, createCoupon);
router.put('/:id', protect, admin, updateCoupon);
router.delete('/:id', protect, admin, deleteCoupon);

export default router;
