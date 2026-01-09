# Admin Panel Documentation (Arvind Sweets)

This document describes the **Admin Panel UI** in the Arvind Sweets frontend (React + Vite), including routes, access control, and day-to-day workflows.

> For first-time setup (creating an admin user + Cloudinary env vars), see [ADMIN_SETUP.md](ADMIN_SETUP.md).

---

## 1) Access & Security Model

### Who can access
- Admin pages are guarded by an **admin-only route wrapper**.
- A user must be:
  - Logged in (valid JWT present)
  - Have `role: "admin"`

If either check fails:
- Not logged in → redirected to `/login`
- Logged in but not admin → redirected to `/`

### Where this is enforced (frontend)
- Route gate: [src/components/AdminRoute.jsx](src/components/AdminRoute.jsx)
- Token injection for API requests: [src/services/api.js](src/services/api.js)

---

## 2) Admin Routes (Navigation)

The admin panel is routed under `/admin/*` and uses its own sidebar + top navbar.

### Main routes
- Dashboard: `/admin`
- Orders: `/admin/orders`
- Products:
  - List: `/admin/products`
  - Add: `/admin/products/add`
  - Edit: `/admin/products/edit/:id`
- Offers: `/admin/offers`
- Coupons: `/admin/coupons`
- Users: `/admin/users`
- Delivery Settings: `/admin/settings/delivery`
- Customer Messages: `/admin/messages`
- Admin Profile: `/admin/profile`

Route declarations live in: [src/App.jsx](src/App.jsx)

---

## 3) Admin Layout

### Sidebar
The sidebar provides primary navigation and a Logout button.
- File: [src/admin/components/AdminSidebar.jsx](src/admin/components/AdminSidebar.jsx)
- Logout behavior: clears `localStorage` keys `token` and `user`, then redirects to `/`.

### Navbar (notifications)
The navbar shows:
- A bell icon with **unread order count**
- A dropdown panel of **recent orders**
- Admin name (from `localStorage.user`)

It also:
- Polls the backend for the **latest order** every ~10 seconds
- Listens via socket for **order cancellation** events and triggers a browser notification when possible

- File: [src/admin/components/AdminNavbar.jsx](src/admin/components/AdminNavbar.jsx)

---

## 4) Features By Page

### 4.1 Dashboard (`/admin`)
- Product stats:
  - Total products
  - Available products (`isAvailable` and `stock > 0`)
  - Out-of-stock products
  - Featured products (`isFeatured`)
- Orders analytics:
  - “Orders by Date” line chart for the last 14 days
- Quick actions shortcuts

- File: [src/admin/pages/AdminDashboard.jsx](src/admin/pages/AdminDashboard.jsx)

### 4.2 Products (`/admin/products`)
- Table view of products with:
  - Image thumbnail
  - Name, category
  - Price and discount
  - Stock
  - Availability status
  - Featured badge + featured rank
- Actions:
  - Edit product
  - Delete product (confirmation required)

- File: [src/admin/pages/ProductsList.jsx](src/admin/pages/ProductsList.jsx)

### 4.3 Add / Edit Product (`/admin/products/add`, `/admin/products/edit/:id`)
Uses a shared `ProductForm` component.

#### Product fields
- Name (required)
- Description (required)
- Category (required)
  - Defaults to `Bengali Sweets`
- Price (required)
- Discount (%; optional)
- Weight (optional; default `250g`)
- Stock (required)
- Flags:
  - `isAvailable`
  - `isFeatured`
  - `featuredRank` (only when featured)
- Images:
  - Up to 5 images
  - Uploaded to Cloudinary (see “Image Uploads” section below)

- Add page: [src/admin/pages/AddProduct.jsx](src/admin/pages/AddProduct.jsx)
- Edit page: [src/admin/pages/EditProduct.jsx](src/admin/pages/EditProduct.jsx)
- Form: [src/admin/components/ProductForm.jsx](src/admin/components/ProductForm.jsx)

### 4.4 Orders (`/admin/orders`)
This is the operational hub for order management.

#### What you can do
- View orders list (auto-refreshes every ~10 seconds)
- Open an order details modal
- Update order status (select from predefined status options)
- Assign a delivery boy (role-based users)
- Enable/disable live tracking (requires assigned delivery boy)
- Generate and copy a delivery tracking link (requires assigned delivery boy)
- Monitor last known live location when tracking is active

#### Real-time & notifications
- New order detection:
  - Polling refresh every ~10 seconds
  - Audio alert: `/order-notification.mp3`
  - Browser Notifications API (permission-based)
- Live tracking:
  - Joins an order room via socket when:
    - Order status is `Out for Delivery`
    - AND `liveTrackingEnabled` is `true`
  - Listens for `orderLocationUpdate`

- File: [src/admin/pages/OrdersList.jsx](src/admin/pages/OrdersList.jsx)

### 4.5 Users (`/admin/users`)
Manage user accounts.

#### Capabilities
- List users
- Create user
- Edit user
- Delete user
  - Prevents deleting the currently logged-in admin user

#### Roles supported
- `customer`
- `delivery_boy`
- `admin`

- File: [src/admin/pages/UsersList.jsx](src/admin/pages/UsersList.jsx)

### 4.6 Offers (`/admin/offers`)
Create and manage Home page offers.

#### Fields
- Title (required)
- Description
- CTA text + link
- Active flag
- Starts / ends date-time

- File: [src/admin/pages/OffersList.jsx](src/admin/pages/OffersList.jsx)

### 4.7 Coupons (`/admin/coupons`)
Create and manage coupon codes and “login popup” coupons.

#### Fields
- Code (required)
- Title, description
- Image URL (can upload image from admin)
- Discount:
  - Type: `flat` or `percent`
  - Value
  - Min order value
  - Max discount (only for percent)
- Validity windows: starts / ends
- Active flag
- Show on login popup flag
- Usage limits:
  - Total usage limit (optional)
  - Per-user limit

- File: [src/admin/pages/CouponsList.jsx](src/admin/pages/CouponsList.jsx)

### 4.8 Delivery Settings (`/admin/settings/delivery`)
Configure delivery calculation knobs used by the app.

#### Controls
- Delivery buffer time (minutes)
- “Show product stock quantity” toggle (website UI)

#### Delivery range rules (time-based distance/pricing)
- Enable/disable rules
- Timezone + rounding
- Rules define:
  - Time window
  - Included km
  - Max km
  - Free above amount
  - Per extra km charge

- File: [src/admin/DeliverySettings.jsx](src/admin/DeliverySettings.jsx)

### 4.9 Customer Messages (`/admin/messages`)
Read Contact Us submissions.

- Lists: name, email, phone (if any), subject, message, created time
- File: [src/admin/pages/AdminMessages.jsx](src/admin/pages/AdminMessages.jsx)

### 4.10 Admin Profile (`/admin/profile`)
Edit the admin’s own profile info.

- Update: name, email, phone, address fields
- Logout button
- File: [src/admin/pages/AdminProfile.jsx](src/admin/pages/AdminProfile.jsx)

---

## 5) Image Uploads (Admin)

Admin product and coupon images use the Cloudinary upload utility.

### How uploads work
The uploader prefers **backend signed uploads** (recommended), and falls back to unsigned preset uploads.

- Upload helper: [src/admin/services/cloudinaryUpload.js](src/admin/services/cloudinaryUpload.js)
- Coupon image upload usage: [src/admin/pages/CouponsList.jsx](src/admin/pages/CouponsList.jsx)
- Product images usage: [src/admin/components/ProductForm.jsx](src/admin/components/ProductForm.jsx)

### Required env vars (frontend)
At minimum for unsigned uploads:
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

Optional:
- `VITE_USE_BACKEND_UPLOAD=false` (forces unsigned preset uploads only)
- `VITE_CLOUDINARY_FOLDER` (default folder for product images)

See [ADMIN_SETUP.md](ADMIN_SETUP.md) for the full Cloudinary setup walkthrough.

---

## 6) Backend Connectivity & Env

### API base URL
Frontend uses:
- `VITE_BACKEND_URL` (preferred)
- or `VITE_API_URL`

If neither is present and you’re not on localhost, it falls back to the hosted backend origin.

- Axios config: [src/services/api.js](src/services/api.js)

### Socket origin
Sockets use the same backend origin strategy as the API.

- Socket config: [src/services/socket.js](src/services/socket.js)

---

## 7) Admin Workflows (How-To)

### Add a product
1. Go to `/admin/products/add`
2. Fill product fields (name, description, price, stock, category)
3. Upload up to 5 images
4. Optionally set:
   - `isFeatured` and `featuredRank`
   - discount (%)
5. Save → product appears in `/admin/products`

### Update an order status
1. Go to `/admin/orders`
2. Open an order
3. Select a new status (e.g., Pending → Processing → Out for Delivery → Delivered)

### Assign a delivery boy + share tracking link
1. Go to `/admin/orders`
2. Open an order
3. Select a delivery boy and save assignment
4. Enable tracking (if your backend supports it)
5. Click “Copy tracking link” and share with the customer

### Configure delivery settings
1. Go to `/admin/settings/delivery`
2. Adjust delivery buffer and/or delivery range rules
3. Save

---

## 8) Troubleshooting

### “I can’t open /admin”
- Ensure you’re logged in and your user has `role: "admin"`.
- If you get redirected to `/login`, your token is missing/expired.

### Admin API calls return 401/403
- Token may be missing or invalid: check `localStorage.getItem('token')`.
- Confirm backend is running and `VITE_BACKEND_URL` points to it.

### Image upload fails
- If using unsigned uploads, confirm:
  - `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are set
  - Preset is **Unsigned** in Cloudinary settings
- If using backend signed uploads, confirm backend endpoint exists and admin auth is working.

### Live tracking doesn’t update
- Tracking activates only when order status is `Out for Delivery` and `liveTrackingEnabled` is `true`.
- Ensure socket connectivity to backend origin (CORS / WS allowed).

---

## 9) Reference: Admin API Calls Used

These are the frontend calls made from the admin UI.

- Products: `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`
- Orders: `GET /api/orders`, `GET /api/orders/latest`, `PUT /api/orders/:id/status`
- Delivery assignment & tracking:
  - `PUT /api/orders/:id/assign-delivery`
  - `PUT /api/orders/:id/tracking`
  - `POST /api/orders/:id/tracking-link`
- Users: `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id`
- Delivery boys: `GET /api/users/delivery-boys`
- Settings: `GET /api/settings/get`, `PUT /api/settings/update`
- Offers: `GET /api/offers`, `POST /api/offers`, `PUT /api/offers/:id`, `DELETE /api/offers/:id`
- Coupons: `GET /api/coupons`, `POST /api/coupons`, `PUT /api/coupons/:id`, `DELETE /api/coupons/:id`
- Messages: `GET /api/messages`

Implementation reference: [src/admin/services/adminApi.js](src/admin/services/adminApi.js)
