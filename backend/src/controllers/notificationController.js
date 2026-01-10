import User from '../models/User.js';

function safeTrim(value) {
  return String(value || '').trim();
}

function sanitizeInternalPath(value) {
  const v = safeTrim(value);
  if (!v) return '';
  // Only allow internal SPA paths for safety.
  return v.startsWith('/') ? v : '';
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Admin-only: emit an in-app test notification over Socket.IO.
 * Body:
 * - audience: 'user' | 'all' | 'role'
 * - email?: string (for audience=user)
 * - userId?: string (for audience=user)
 * - role?: 'customer'|'delivery_boy'|'admin' (for audience=role)
 * - title: string
 * - message?: string
 * - url?: string (internal path, e.g. '/products')
 */
export const sendAdminNotification = async (req, res) => {
  try {
    const io = req.app.get('io');

    const audience = safeTrim(req.body?.audience || 'all');
    const title = safeTrim(req.body?.title);
    const message = safeTrim(req.body?.message);
    const url = sanitizeInternalPath(req.body?.url);

    if (!title && !message) {
      return res.status(400).json({ message: 'Title or message is required' });
    }

    const payload = {
      id: makeId(),
      type: 'admin_test',
      title: title || 'Update',
      message: message || '',
      url,
      createdAt: new Date().toISOString(),
      meta: {
        senderAdminId: String(req.user?._id || ''),
      },
    };

    if (!io) {
      // Socket server not available (e.g. tests). Still return success.
      return res.json({ ok: true, delivered: false, reason: 'socket_not_initialized', payload });
    }

    if (audience === 'user') {
      const userIdRaw = safeTrim(req.body?.userId);
      const emailRaw = safeTrim(req.body?.email).toLowerCase();

      let userId = userIdRaw;
      if (!userId && emailRaw) {
        const user = await User.findOne({ email: emailRaw }).select('_id email').lean();
        if (!user?._id) {
          return res.status(404).json({ message: 'User not found for email' });
        }
        userId = String(user._id);
      }

      if (!userId) {
        return res.status(400).json({ message: 'userId or email is required for audience=user' });
      }

      io.to(`user:${userId}`).emit('app:notification', payload);
      return res.json({ ok: true, delivered: true, audience: 'user', userId, payload });
    }

    if (audience === 'role') {
      const role = safeTrim(req.body?.role);
      if (!role) {
        return res.status(400).json({ message: 'role is required for audience=role' });
      }
      io.to(`role:${role}`).emit('app:notification', payload);
      return res.json({ ok: true, delivered: true, audience: 'role', role, payload });
    }

    // Default: all authenticated users.
    io.to('users').emit('app:notification', payload);
    return res.json({ ok: true, delivered: true, audience: 'all', payload });
  } catch (error) {
    console.error('sendAdminNotification failed:', error);
    return res.status(500).json({ message: 'Failed to send notification' });
  }
};
