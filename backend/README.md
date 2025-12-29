# Backend API

Backend API for Arvind Sweets application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```env
   MONGO_URI=mongodb://localhost:27017/arvind-sweets
   JWT_SECRET=your-secret-key-here-change-this-in-production
   PORT=5000

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

   # Where backend redirects after Google login
   FRONTEND_URL=http://localhost:5173

   # Optional allowlist for safe multi-environment redirect testing
   FRONTEND_URLS=http://localhost:5173,https://arvindsweets.com
   ```

3. Start MongoDB:
   - **Option 1 (Local)**: Ensure MongoDB is running on your machine
   - **Option 2 (Atlas)**: Use MongoDB Atlas connection string in `.env`

4. Run the server:
   ```bash
   npm run dev
   ```

## Important Notes

- **MongoDB Connection**: The server will start even if MongoDB is not connected, but database operations will fail. For development, sample product data will be returned when DB is not connected.
- **Admin Users**: To create an admin user, manually set `role: 'admin'` in the database for a user account.

## Troubleshooting

### 500 Internal Server Error
- **Check MongoDB**: Ensure MongoDB is running and accessible
- **Check .env file**: Verify MONGODB_URI is correct
- **Check console logs**: Backend will log connection errors

### Database Connection Issues
- Verify MongoDB is running: `mongod` or check MongoDB service
- Check connection string format in `.env`
- For MongoDB Atlas: Ensure IP is whitelisted

## Google Sign-In (OAuth 2.0)

Endpoints:
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Google Cloud Console settings for local dev:
- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`

Production settings (deployed):
- Authorized JavaScript origin: `https://arvindsweets.com`
- Authorized redirect URI: `https://arvind-sweets.onrender.com/api/auth/google/callback`

### Testing both local + deployed
The backend supports an allowlisted redirect override:
- `GET /api/auth/google?redirect=http://localhost:5173`

To enable this safely in production, set:
```env
FRONTEND_URL=https://arvindsweets.com
FRONTEND_URLS=http://localhost:5173,https://arvindsweets.com
```
