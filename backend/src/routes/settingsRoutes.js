import express from 'express';
import { getPublicSettings, getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public (no auth): safe settings needed by checkout
router.get('/public', getPublicSettings);

router.get('/get', protect, admin, getSettings);
router.put('/update', protect, admin, updateSettings);

export default router;
