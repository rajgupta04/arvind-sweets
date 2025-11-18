# Admin Panel Setup Guide

## 📋 How to Access Admin Panel

### Step 1: Create an Admin User

You need to have a user account with `role: 'admin'` in your MongoDB database.

**Option A: Create Admin via Database (Recommended)**
1. Register a normal user account through `/register` page
2. Open MongoDB (MongoDB Compass or mongo shell)
3. Find your user in the `users` collection
4. Update the user document:
   ```javascript
   { role: "admin" }
   ```

**Option B: Create Admin via Backend Script**
Create a script to set a user as admin, or manually insert:
```javascript
db.users.updateOne(
  { email: "your-admin@email.com" },
  { $set: { role: "admin" } }
)
```

### Step 2: Login

1. Navigate to `/login` in your browser
2. Enter your admin email and password
3. After successful login, you'll be redirected to home page

### Step 3: Access Admin Panel

Once logged in as admin, navigate to:
- **Dashboard**: `http://localhost:5173/admin`
- **Products List**: `http://localhost:5173/admin/products`
- **Add Product**: `http://localhost:5173/admin/products/add`

**Note**: If you're not logged in as admin, you'll be automatically redirected to home page.

---

## 🔐 Authentication & Security

The admin panel checks:
- User must be logged in (has valid JWT token)
- User must have `role: 'admin'` in database
- If either check fails, user is redirected to home page

---

## ☁️ Cloudinary Setup (Image Uploads)

### Why No API Key?

Cloudinary uses **unsigned uploads with upload presets** for frontend uploads. This means:
- ✅ **No API keys needed on frontend** (more secure)
- ✅ Upload preset is configured in Cloudinary dashboard
- ✅ Preset defines upload settings (folder, transformations, etc.)

### Setup Instructions

1. **Create Cloudinary Account** (if you don't have one)
   - Go to https://cloudinary.com
   - Sign up for free account

2. **Get Your Cloud Name**
   - After login, you'll see your **Cloud Name** in dashboard
   - Example: `dxyz123abc`

3. **Create Upload Preset** (for unsigned uploads)
   - Go to **Settings** → **Upload** → **Upload presets**
   - Click **Add upload preset**
   - Set:
     - **Preset name**: `arvind-sweets-upload` (or any name)
     - **Signing mode**: **Unsigned** (important!)
     - **Folder**: `arvind-sweets/products` (optional, for organization)
   - Click **Save**

4. **Configure Environment Variables**

   Create/update `.env` file in `frontend/` directory:
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name-here
   VITE_CLOUDINARY_UPLOAD_PRESET=arvind-sweets-upload
   ```

   **Example:**
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=dxyz123abc
   VITE_CLOUDINARY_UPLOAD_PRESET=arvind-sweets-upload
   ```

5. **Restart Dev Server**
   ```bash
   npm run dev
   ```

### Alternative: Signed Uploads (More Secure)

If you prefer signed uploads (requires backend):
1. Keep API keys on backend only
2. Create endpoint: `POST /api/upload/signature`
3. Frontend requests signature from backend
4. Upload with signature

**Current implementation uses unsigned uploads** (simpler, but preset must be configured correctly).

---

## 🗄️ MongoDB Setup

### Why No MongoDB Config in Frontend?

MongoDB connection is handled **entirely on the backend**. The frontend only makes HTTP API calls.

### Backend MongoDB Configuration

1. **Create `.env` file in `backend/` directory:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/arvind-sweets
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arvind-sweets
   
   JWT_SECRET=your-secret-key-here-change-in-production
   PORT=5000
   ```

2. **Start MongoDB:**
   - **Local**: Ensure MongoDB service is running
   - **Atlas**: Use connection string from MongoDB Atlas dashboard

3. **Backend handles:**
   - Database connection
   - Data validation
   - Authentication
   - API endpoints

### Frontend Only Needs:
- API base URL (defaults to `/api`)
- JWT token for authentication (stored in localStorage after login)

---

## 🚀 Quick Start Checklist

- [ ] MongoDB running (local or Atlas)
- [ ] Backend `.env` configured with `MONGODB_URI` and `JWT_SECRET`
- [ ] Backend server running (`npm run dev` in backend folder)
- [ ] Frontend `.env` configured with Cloudinary credentials
- [ ] Admin user created in database with `role: 'admin'`
- [ ] Frontend server running (`npm run dev` in frontend folder)
- [ ] Login at `/login` with admin credentials
- [ ] Access admin panel at `/admin`

---

## 🔧 Troubleshooting

### "Redirected to home page when accessing /admin"
- **Solution**: Make sure you're logged in AND your user has `role: 'admin'` in database

### "Image upload fails"
- **Solution**: 
  1. Check Cloudinary credentials in `.env`
  2. Verify upload preset is set to "Unsigned"
  3. Check browser console for errors
  4. Ensure Cloudinary cloud name is correct

### "API calls fail (401/403)"
- **Solution**: 
  1. Make sure you're logged in
  2. Check if token exists: `localStorage.getItem('token')`
  3. Verify backend is running
  4. Check backend CORS settings

### "MongoDB connection errors"
- **Solution**: 
  1. Verify MongoDB is running
  2. Check `MONGODB_URI` in backend `.env`
  3. For Atlas: Ensure IP is whitelisted
  4. Check backend console logs

---

## 📝 Environment Variables Summary

### Frontend `.env` (in `frontend/` folder):
```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name
```

### Backend `.env` (in `backend/` folder):
```env
MONGODB_URI=mongodb://localhost:27017/arvind-sweets
JWT_SECRET=your-secret-key
PORT=5000
```

---

## 🎯 Admin Panel Features

Once set up, you can:
- ✅ View all products in a table
- ✅ Add new products with images (1-5 images)
- ✅ Edit existing products
- ✅ Delete products
- ✅ View dashboard statistics
- ✅ Upload images directly to Cloudinary

All changes are saved to MongoDB via your Express backend API.

