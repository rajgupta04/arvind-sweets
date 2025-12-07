import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/get', protect, admin, getSettings);
router.put('/update', protect, admin, updateSettings);

export default router;
