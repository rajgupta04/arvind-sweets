import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { NotificationsContext } from '../context/NotificationsContext';

function formatTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useContext(NotificationsContext);

  const list = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
          <div className="text-sm text-gray-600">Unread: {unreadCount}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            disabled={list.length === 0 || unreadCount === 0}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            disabled={list.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6 text-gray-600">
          No notifications yet.
          <div className="mt-3">
            <Link to="/products" className="inline-flex px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">
              Order now
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const time = formatTime(n.createdAt);
            const hasOrder = Boolean(n.orderId);

            return (
              <div
                key={n.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${n.read ? 'opacity-80' : 'border-orange-200'}`}
                onMouseEnter={() => markAsRead(n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{n.title}</div>
                    {time ? <div className="text-xs text-gray-500 mt-0.5">{time}</div> : null}
                  </div>
                  {!n.read ? <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">NEW</span> : null}
                </div>

                {n.message ? <div className="mt-2 text-sm text-gray-700">{n.message}</div> : null}

                {hasOrder ? (
                  <div className="mt-3 rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-700">Order</div>
                      <div className="font-mono text-gray-900">{n.orderId}</div>
                    </div>
                  </div>
                ) : null}

                {Array.isArray(n.actions) && n.actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {n.actions.map((a, idx) => (
                      <Link
                        key={`${n.id}_${idx}`}
                        to={a.to}
                        className="inline-flex px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
