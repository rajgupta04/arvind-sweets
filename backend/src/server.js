// backend/src/server.js
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import http from 'http';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';

// Load env vars.
// - In production (Render/Vercel/etc), env vars are usually injected and dotenv isn't needed.
// - In local/dev, support running from repo root OR from the backend folder.
(() => {
  try {
    // First load whatever the platform provides.
    dotenv.config();

    // If already configured (e.g. hosted env vars), don't override.
    if (process.env.MONGO_URI) return;

    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'backend', '.env'),
    ];

    const found = candidates.find((p) => fs.existsSync(p));
    if (found) {
      dotenv.config({ path: found });
    }
  } catch {
    // ignore
  }
})();

// Important: in ESM, static imports are evaluated before dotenv.config.
// Use a dynamic import so app initialization sees env vars.
const { default: app } = await import('./app.js');

// Avoid logging sensitive env vars (like MONGO_URI credentials).

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found. Check .env file path or dotenv.config()');
  process.exit(1);
}

// ✅ Connect to database first
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    const server = http.createServer(app);

    initSocket(server, { app });

    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
