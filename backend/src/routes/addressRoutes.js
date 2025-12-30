import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  deleteMyAddress,
  listMyAddresses,
  setDefaultMyAddress,
  updateMyAddress,
  upsertMyAddress,
} from '../controllers/addressController.js';

const router = express.Router();

router.route('/')
  .get(protect, listMyAddresses)
  .post(protect, upsertMyAddress);

router.route('/:id')
  .put(protect, updateMyAddress)
  .delete(protect, deleteMyAddress);

router.put('/:id/default', protect, setDefaultMyAddress);

export default router;
