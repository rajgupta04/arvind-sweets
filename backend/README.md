# Backend API

Backend API for Arvind Sweets application.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/arvind-sweets
   JWT_SECRET=your-secret-key-here-change-this-in-production
   PORT=5000
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
