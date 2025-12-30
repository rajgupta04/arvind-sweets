// Token generator utility
import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  const userId = typeof user === 'object' && user?._id ? user._id : user;
  const role = typeof user === 'object' && user?.role ? user.role : undefined;

  return jwt.sign({ userId, id: userId, role }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

export default generateToken;
