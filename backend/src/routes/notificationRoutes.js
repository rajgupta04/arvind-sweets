import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { sendAdminNotification } from '../controllers/notificationController.js';

const router = express.Router();

// Admin testing endpoint: emit in-app notification over socket
router.post('/admin/send', protect, admin, sendAdminNotification);

export default router;
