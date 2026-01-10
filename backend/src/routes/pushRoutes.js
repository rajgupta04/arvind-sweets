import express from 'express';
import { admin, protect } from '../middleware/authMiddleware.js';
import { getPushDiagnosticsController, getVapidPublicKey, subscribePush, testPushAdmins, testPushSelf, unsubscribePush } from '../controllers/pushController.js';

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', protect, subscribePush);
router.post('/unsubscribe', protect, unsubscribePush);

// Debug/test helpers
router.get('/diagnostics', protect, admin, getPushDiagnosticsController);
router.post('/test/self', protect, testPushSelf);
router.post('/test/admins', protect, admin, testPushAdmins);

export default router;
