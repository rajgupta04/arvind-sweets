import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

const STORAGE_KEY = 'as_notifications_v1';

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const unreadCount = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n) => !n?.read).length : 0),
    [notifications]
  );

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((n) => (n?.id === id ? { ...n, read: true } : n));
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((n) => {
    if (!n || typeof n !== 'object') return;

    const entry = {
      id: makeId(),
      type: String(n.type || 'info'),
      title: String(n.title || 'Update'),
      message: String(n.message || ''),
      createdAt: n.createdAt ? String(n.createdAt) : new Date().toISOString(),
      read: false,
      orderId: n.orderId ? String(n.orderId) : '',
      actions: Array.isArray(n.actions) ? n.actions.slice(0, 3) : [],
      meta: n.meta && typeof n.meta === 'object' ? n.meta : {},
    };

    setNotifications((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const next = [entry, ...list].slice(0, 50);
      return next;
    });

    // Best-effort system notification (only if user already granted permission)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
          // eslint-disable-next-line no-new
          new Notification(entry.title, { body: entry.message });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
