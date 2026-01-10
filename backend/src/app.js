// Express configuration - routes, middlewares
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { configurePassport } from './config/passport.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import deliveryBoyRoutes from './routes/deliveryBoyRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import debugWhatsAppRoutes from './routes/debugWhatsAppRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth (no sessions)
app.use(passport.initialize());
configurePassport();
app.get("/", (req, res) => {
  // res.send("Arvind Sweets API is running 🍬");
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Test route (for backward compatibility)
app.get('/api/sweets', (req, res) => {
  res.json([
    { id: 1, name: "Kaju Katli", price: 120 },
    { id: 2, name: "Rasgulla", price: 90 }
  ]);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery-boys', deliveryBoyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/debug/whatsapp', debugWhatsAppRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;
