import React, { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NotificationsContext } from '../context/NotificationsContext';
import { createSocket } from '../services/socket';
import { toast } from './ui/use-toast';

function asInternalPath(value) {
  const v = String(value || '').trim();
  return v.startsWith('/') ? v : '';
}

export default function AppNotificationsListener() {
  const { user, token } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationsContext);

  const socketRef = useRef(null);

  const enabled = Boolean(token && user && user?.role);

  useEffect(() => {
    if (!enabled) {
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
      return;
    }

    try {
      socketRef.current?.disconnect();
    } catch {}

    const socket = createSocket();
    socketRef.current = socket;

    const onAppNotification = (payload) => {
      const title = String(payload?.title || 'Update');
      const message = String(payload?.message || '');
      const url = asInternalPath(payload?.url);

      addNotification({
        type: String(payload?.type || 'info'),
        title,
        message,
        createdAt: payload?.createdAt,
        actions: url ? [{ label: 'Open', to: url }] : [],
        meta: payload?.meta,
      });

      toast({ title, description: message || 'New notification received' });
    };

    socket.on('app:notification', onAppNotification);

    return () => {
      try {
        socket.off('app:notification', onAppNotification);
        socket.disconnect();
      } catch {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return null;
}
