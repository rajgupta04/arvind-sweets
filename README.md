# Arvind Sweets - Full-Stack E-Commerce Platform

A complete MERN stack application for a sweet shop e-commerce platform with customer and admin interfaces.

## 🎯 Features

### Customer Features
- ✅ **Home Page** - Banner, featured sweets, categories, shop story
- ✅ **Product Listing** - Browse with filters (category, price, search)
- ✅ **Product Details** - Image gallery, description, ingredients, add to cart
- ✅ **Shopping Cart** - Add, update quantity, remove items
- ✅ **Checkout** - COD payment, delivery/pickup options, order summary
- ✅ **Order Tracking** - View order history with status timeline
- ✅ **User Authentication** - Sign up, login with JWT
- ✅ **Contact/Feedback** - Customer inquiry form

### Admin Features
- ✅ **Dashboard** - Sales overview, charts (Recharts), statistics
- ✅ **Product Management** - Create, Read, Update, Delete products
- ✅ **Order Management** - View and update order statuses
- ✅ **Customer Management** - View all registered customers

## 🛠 Tech Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing
- CORS enabled

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS
- Axios for API calls
- Recharts for graphs
- React Icons

## 📁 Project Structure

```
arvind-sweets/
├── backend/
│   ├── src/
│   │   ├── config/         # DB, Redis configs
│   │   ├── models/         # Mongoose schemas
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middleware/    # Auth, error handling
│   │   ├── utils/          # Helpers
│   │   ├── app.js          # Express config
│   │   └── server.js       # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── context/        # React Context (Auth, Cart)
    │   ├── services/       # API service functions
    │   ├── App.jsx         # Main app component
    │   └── main.jsx       # Entry point
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm
- MongoDB (local or MongoDB Atlas)

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/arvind-sweets
   JWT_SECRET=your-secret-key-here
   PORT=5000
   ```

4. Start the server:
   ```bash
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

## 📡 API Endpoints

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Users/Auth
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update profile (Protected)
- `GET /api/users` - Get all users (Admin)

### Orders
- `POST /api/orders` - Create order (Protected)
- `GET /api/orders/myorders` - Get user orders (Protected)
- `GET /api/orders/:id` - Get order by ID (Protected)
- `GET /api/orders` - Get all orders (Admin)
- `PUT /api/orders/:id/status` - Update order status (Admin)

## 🔐 Admin Access

To create an admin user, you'll need to manually set `role: 'admin'` in the MongoDB database for a user account.

## 📝 Notes

- Product images: Currently supports URL strings. For production, implement file upload with Multer.
- Password reset: Frontend UI exists, backend implementation can be added.
- Reports download: Dashboard shows data, CSV/PDF export can be added.

## 🎨 UI Features

- Responsive design with Tailwind CSS
- Modern card-based layouts
- Loading states and error handling
- Toast notifications for actions
- Smooth transitions and hover effects

## 📦 Dependencies

### Backend
- express, mongoose, cors, dotenv
- bcryptjs, jsonwebtoken
- nodemon (dev)

### Frontend
- react, react-dom, react-router-dom
- axios, tailwindcss
- recharts, react-icons
- vite, @vitejs/plugin-react

---

**Built with ❤️ for Arvind Sweets**

