import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../controllers/uploadController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Signed backend upload (recommended for enforcing transformations server-side)
router.post('/products/image', protect, admin, upload.single('image'), uploadProductImage);

export default router;
