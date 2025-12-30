import express from 'express';
import {
  getActiveOffer,
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from '../controllers/offerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.get('/active', getActiveOffer);

// Admin CRUD
router.route('/')
  .get(protect, admin, listOffers)
  .post(protect, admin, createOffer);

router.route('/:id')
  .put(protect, admin, updateOffer)
  .delete(protect, admin, deleteOffer);

export default router;
