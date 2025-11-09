# Testing the API

## Steps to verify products are showing:

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   Should see: "Server running on http://localhost:5000"
   If MongoDB is not connected, should see: "MongoDB not connected, returning sample data"

2. **Test the API directly in browser:**
   Open: `http://localhost:5000/api/products`
   You should see a JSON array of products

3. **Test featured products:**
   Open: `http://localhost:5000/api/products?featured=true`
   Should return products with isFeatured: true

4. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any errors or the debug logs I added
   - Check Network tab to see if API calls are being made

5. **Common issues:**
   - Backend not running → Products won't load
   - CORS error → Check backend CORS settings
   - Network error → Check if backend is on port 5000
   - Empty response → Check backend logs for errors

