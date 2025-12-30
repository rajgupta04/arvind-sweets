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
  rateOrder,
  generateDeliveryTrackingLink,
  getOrderTracking,
  setOrderTrackingEnabled,
  getMyDeliveryOrders,
  startDelivery,
  markDeliveredByDeliveryBoy,
  cancelOrder
} from '../controllers/orderController.js';
import { protect, admin, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/delivery/my-packages', protect, authorizeRoles('delivery_boy'), getMyDeliveryOrders);
router.get('/latest', protect, admin, getLatestOrder);
router.get('/:id/tracking', protect, getOrderTracking);
router.post('/:id/ratings', protect, rateOrder);
router.post('/:id/cancel', protect, cancelOrder);
router.get('/:id', protect, getOrderById);
router.get('/', protect, admin, getOrders);
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/status', protect, admin, updateOrderStatus);
router.put('/:id/tracking', protect, admin, setOrderTrackingEnabled);
router.put('/:id/assign-delivery', protect, admin, assignDeliveryBoyToOrder);
router.post('/:id/tracking-link', protect, admin, generateDeliveryTrackingLink);

router.put('/:id/start-delivery', protect, authorizeRoles('delivery_boy'), startDelivery);
router.put('/:id/mark-delivered', protect, authorizeRoles('delivery_boy'), markDeliveredByDeliveryBoy);

export default router;
