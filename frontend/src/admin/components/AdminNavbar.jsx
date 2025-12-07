// Admin Navbar Component
import React, { useEffect, useRef, useState } from 'react';
import { FiMenu, FiBell, FiUser } from 'react-icons/fi';
import { getLatestOrder } from '../services/adminApi';

const formatAmount = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function AdminNavbar({ onMenuClick }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [recentOrders, setRecentOrders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastBroadcastedId = useRef(localStorage.getItem('admin:lastBroadcastedOrder') || '');

  useEffect(() => {
    let intervalId;

    const checkLatestOrder = async (initial = false) => {
      try {
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
        console.error('Failed to fetch latest order', error);
      }
    };

    checkLatestOrder(true);
    intervalId = setInterval(() => checkLatestOrder(false), 10000);

    return () => clearInterval(intervalId);
  }, []);

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

  return (
    <nav className="fixed top-0 left-64 right-0 h-16 bg-white shadow-md z-30 flex items-center justify-between px-6">
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
                    </p>
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

