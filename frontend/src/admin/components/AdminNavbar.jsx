// Admin Navbar Component
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiArrowLeft, FiZap } from 'react-icons/fi';
import { getLatestOrder } from '../services/adminApi';
import { createSocket } from '../../services/socket';
import { ensurePushSubscribed, getLocalPushStatus } from '../../services/push';

const formatAmount = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function AdminNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [recentOrders, setRecentOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState('');
  const lastBroadcastedId = useRef(localStorage.getItem('admin:lastBroadcastedOrder') || '');
  const socketRef = useRef(null);

  useEffect(() => {
    let intervalId;

    const handleAuthFailure = () => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      try {
        clearInterval(intervalId);
      } catch {}
      navigate('/login');
    };

    const checkLatestOrder = async (initial = false) => {
      try {
        const token = (() => {
          try {
            return localStorage.getItem('token');
          } catch {
            return null;
          }
        })();

        // If there's no token, do not poll protected admin endpoints.
        if (!token) {
          if (initial) {
            setRecentOrders([]);
            setUnreadCount(0);
          }
          return;
        }

        const latest = await getLatestOrder();
        if (!latest) return;

        if (!lastBroadcastedId.current) {
          lastBroadcastedId.current = latest._id;
          localStorage.setItem('admin:lastBroadcastedOrder', latest._id);
          setRecentOrders([latest]);
          return;
        }

        if (latest._id !== lastBroadcastedId.current) {
          lastBroadcastedId.current = latest._id;
          localStorage.setItem('admin:lastBroadcastedOrder', latest._id);
          setRecentOrders((prev) => [latest, ...prev.filter((o) => o._id !== latest._id)].slice(0, 5));
          setUnreadCount((prev) => prev + 1);
          window.dispatchEvent(new CustomEvent('admin:new-order', { detail: latest }));
        } else if (initial) {
          setRecentOrders((prev) => (prev.length ? prev : [latest]));
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          handleAuthFailure();
          return;
        }
        console.error('Failed to fetch latest order', error);
      }
    };

    checkLatestOrder(true);
    intervalId = setInterval(() => checkLatestOrder(false), 10000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getLocalPushStatus();
        if (cancelled) return;

        if (!status?.supported) {
          setPushStatus('Push unsupported on this device');
          return;
        }

        if (status.permission === 'denied') {
          setPushStatus('Notifications blocked');
          return;
        }

        if (status.subscribed) {
          setPushStatus('Push: ON');
        } else {
          setPushStatus('Push: OFF');
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    try {
      socketRef.current?.disconnect();
    } catch {}

    const socket = createSocket();
    socketRef.current = socket;

    const triggerCancellationNotification = (order) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      const reason = order?.cancellation?.reasonLabel || 'Cancelled';

      const notify = () => {
        try {
          new Notification('Order Cancelled', {
            body: `Order ID: ${order?._id}\nReason: ${reason}`,
            tag: `cancel:${order?._id}`,
          });
        } catch (error) {
          console.warn('Notification error', error);
        }
      };

      if (Notification.permission === 'granted') {
        notify();
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            notify();
          }
        });
      }
    };

    socket.on('adminOrderCancelled', (payload) => {
      const order = payload?.order;
      if (!order?._id) return;

      setRecentOrders((prev) => [order, ...prev.filter((o) => o._id !== order._id)].slice(0, 5));
      setUnreadCount((prev) => prev + 1);
      triggerCancellationNotification(order);

      window.dispatchEvent(new CustomEvent('admin:order-cancelled', { detail: order }));
    });

    return () => {
      try {
        socket.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [user?.role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.admin-notification-panel') && panelOpen) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const handleBellClick = () => {
    setPanelOpen((prev) => {
      if (!prev) {
        setUnreadCount(0);
      }
      return !prev;
    });
  };

  const handleEnablePush = async () => {
    try {
      setPushBusy(true);
      setPushStatus('');
      const result = await ensurePushSubscribed();
      setPushStatus(result?.status || 'enabled');
      setTimeout(() => setPushStatus(''), 4000);
    } catch (e) {
      const msg = e?.message || 'Failed to enable push';
      setPushStatus(msg);
      setTimeout(() => setPushStatus(''), 5000);
    } finally {
      setPushBusy(false);
    }
  };

  const handleBackToSite = () => {
    // Bypass the admin auto-redirect when an admin explicitly wants the customer site.
    navigate('/?view=site', { replace: false });
  };

  return (
    <nav className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white shadow-md z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <FiMenu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-4 relative">
        <button
          type="button"
          onClick={handleBackToSite}
          className="flex items-center gap-2 text-sm px-2 sm:px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          title="Back to Site"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Site</span>
          <span className="sm:hidden">Site</span>
        </button>

        <button
          type="button"
          onClick={handleEnablePush}
          disabled={pushBusy}
          className={
            `flex items-center gap-2 text-sm px-2 sm:px-3 py-2 rounded-lg ` +
            (pushBusy
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700')
          }
          title="Enable push notifications for new orders"
        >
          <FiZap className="w-4 h-4" />
          <span className="sm:hidden">{pushBusy ? '...' : 'Push'}</span>
          <span className="hidden sm:inline">{pushBusy ? 'Enabling...' : 'Enable Push'}</span>
        </button>

        {pushStatus ? (
          <span className="text-xs text-gray-600 max-w-[140px] sm:max-w-[180px] truncate" title={pushStatus}>
            {pushStatus}
          </span>
        ) : null}

        <button
          onClick={handleBellClick}
          className="relative text-gray-600 hover:text-gray-900 admin-notification-panel"
        >
          <FiBell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1 min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </button>

        {panelOpen && (
          <div className="absolute right-16 top-12 w-72 bg-white border border-gray-200 rounded-lg shadow-lg admin-notification-panel">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-800">Recent Orders</span>
              {recentOrders.length > 0 && (
                <span className="text-xs text-gray-500">
                  Last: {new Date(recentOrders[0].createdAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">No recent orders</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order._id} className="px-4 py-3 border-b last:border-b-0">
                    <p className="text-sm font-mono text-gray-800">{order._id}</p>
                    <p className="text-sm text-gray-600">
                      {order.shippingAddress?.name || 'Customer'} • {formatAmount(order.totalPrice)}
                      {order.orderStatus === 'Cancelled' ? (
                        <span className="text-red-600"> • Cancelled</span>
                      ) : null}
                    </p>

                    {order.orderStatus === 'Cancelled' && (order.cancellation?.reasonLabel || order.cancellation?.message) ? (
                      <p className="text-xs text-gray-600 mt-1">
                        {(order.cancellation?.reasonLabel || '').trim() || 'Cancelled'}
                        {order.cancellation?.message ? ` • ${String(order.cancellation.message).slice(0, 60)}` : ''}
                      </p>
                    ) : null}

                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <FiUser className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {user.name || 'Admin'}
          </span>
        </div>
      </div>
    </nav>
  );
}

export default AdminNavbar;

