import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  createDeliveryBoy,
  listDeliveryBoys,
  updateDeliveryBoy,
} from '../controllers/deliveryBoyController.js';

const router = express.Router();

router.get('/', protect, admin, listDeliveryBoys);
router.post('/', protect, admin, createDeliveryBoy);
router.put('/:id', protect, admin, updateDeliveryBoy);

export default router;
