// Admin Navbar Component
import React from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiBell, FiUser } from 'react-icons/fi';

function AdminNavbar({ onMenuClick }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
      
      <div className="flex items-center space-x-4">
        <button className="relative text-gray-600 hover:text-gray-900">
          <FiBell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
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

