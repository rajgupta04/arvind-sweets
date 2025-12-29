// Order routes - Express route definitions
import express from 'express';
import {
  createOrder,
  getOrderById,
  getLatestOrder,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  updateOrderStatus,
  assignDeliveryBoyToOrder,
  generateDeliveryTrackingLink,
  getOrderTracking,
  setOrderTrackingEnabled
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/latest', protect, admin, getLatestOrder);
router.get('/:id/tracking', protect, getOrderTracking);
router.get('/:id', protect, getOrderById);
router.get('/', protect, admin, getOrders);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.put('/:id/tracking', protect, admin, setOrderTrackingEnabled);
router.put('/:id/assign-delivery', protect, admin, assignDeliveryBoyToOrder);
router.post('/:id/tracking-link', protect, admin, generateDeliveryTrackingLink);

export default router;
