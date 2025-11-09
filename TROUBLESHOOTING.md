# Troubleshooting Products Not Showing

## Quick Checks

1. **Is backend running?**
   - Open terminal in `backend` folder
   - Run: `npm run dev`
   - Should see: "Server running on http://localhost:5000"

2. **Test API directly:**
   - Open browser and go to: `http://localhost:5000/api/products`
   - Should see JSON array with ~20 products
   - If you see error or empty, backend issue

3. **Check browser console:**
   - Open DevTools (F12) → Console tab
   - Look for these logs:
     - "Fetching products with params: {}"
     - "API Response: ..."
     - "Products received: X [...]"
   - If you see errors, note them

4. **Check Network tab:**
   - DevTools → Network tab
   - Refresh page
   - Look for request to `/api/products`
   - Check Status (should be 200)
   - Check Response tab to see what was returned

5. **Common issues:**
   - Backend not running → Products won't load
   - CORS error → Check backend CORS settings
   - 500 error → Check backend console for errors
   - Empty response → Backend might not be returning data correctly

## Debug Steps

1. Open browser console (F12)
2. Navigate to `/products` page
3. Look for console logs showing:
   - API calls being made
   - Response data received
   - Any errors

4. If products array is empty but API returns data:
   - Check if response format matches expected
   - Response should be array directly or `{data: [...]}`

## Expected Behavior

- On page load: Should show all ~20 products
- Products displayed in grid (1-4 columns based on screen size)
- Each product shows: image placeholder, name, price, category, "Add to Cart" button

