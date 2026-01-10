// Admin Sidebar Component
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiPackage, 
  FiPlus, 
  FiList,
  FiTag,
  FiLogOut,
  FiUser,
  FiX
} from 'react-icons/fi';

function AdminSidebar({ open = false, onClose } = {}) {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: FiHome },
    { path: '/admin/orders', label: 'Orders', icon: FiPackage },
    { path: '/admin/products', label: 'All Products', icon: FiList },
    { path: '/admin/products/add', label: 'Add Product', icon: FiPlus },
    { path: '/admin/offers', label: 'Offers', icon: FiTag },
    { path: '/admin/coupons', label: 'Coupons', icon: FiTag },
    { path: '/admin/users', label: 'Users', icon: FiUser },
    { path: '/admin/settings/delivery', label: 'Delivery Settings', icon: FiList },
    { path: '/admin/messages', label: 'Customer Messages', icon: FiList },
    { path: '/admin/profile', label: 'Profile', icon: FiUser },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={
          `fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ` +
          (open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
        onClick={onClose}
      />

      <div
        className={
          `fixed left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg z-50 ` +
          `transform transition-transform duration-200 ` +
          (open ? 'translate-x-0' : '-translate-x-full') +
          ' lg:translate-x-0'
        }
      >
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-orange-500 mb-8">Admin Panel</h2>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-gray-300 hover:text-white"
            aria-label="Close menu"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <FiLogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
      </div>
    </>
  );
}

export default AdminSidebar;
