// Admin Dashboard Page
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { getAllProducts } from '../services/adminApi';
import { FiPackage, FiDollarSign, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    outOfStock: 0,
    featuredProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const products = await getAllProducts();
      const productList = Array.isArray(products) ? products : products.data || [];
      
      setStats({
        totalProducts: productList.length,
        availableProducts: productList.filter(p => p.isAvailable && p.stock > 0).length,
        outOfStock: productList.filter(p => !p.isAvailable || p.stock === 0).length,
        featuredProducts: productList.filter(p => p.isFeatured).length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: FiPackage,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Available',
      value: stats.availableProducts,
      icon: FiTrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock,
      icon: FiAlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: 'Featured',
      value: stats.featuredProducts,
      icon: FiDollarSign,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.name || 'Admin'}!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className={`text-3xl font-bold ${stat.textColor} mt-2`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-full`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/admin/products')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-800">View All Products</h3>
                <p className="text-sm text-gray-600 mt-1">Manage your product inventory</p>
              </button>
              <button
                onClick={() => navigate('/admin/products/add')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-800">Add New Product</h3>
                <p className="text-sm text-gray-600 mt-1">Create a new product listing</p>
              </button>
              <button
                onClick={() => navigate('/admin/products')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-800">Manage Inventory</h3>
                <p className="text-sm text-gray-600 mt-1">Update stock and availability</p>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;

