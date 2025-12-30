// Admin Dashboard Page
import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { getAllOrders, getAllProducts } from '../services/adminApi';
import { FiPackage, FiDollarSign, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatShortDateLabel(dateKey) {
  // dateKey: YYYY-MM-DD
  try {
    const [y, m, d] = String(dateKey).split('-').map((v) => Number(v));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  } catch {
    return String(dateKey);
  }
}

function buildDailySeries(orders, days = 14) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const counts = new Map();
  for (const o of Array.isArray(orders) ? orders : []) {
    const key = toDateKey(o?.createdAt);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const series = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    series.push({
      dateKey: key,
      date: formatShortDateLabel(key),
      orders: counts.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

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
  const [ordersSeries, setOrdersSeries] = useState([]);
  const [ordersSeriesLoading, setOrdersSeriesLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const [products, orders] = await Promise.all([
        getAllProducts(),
        getAllOrders(),
      ]);

      const productList = Array.isArray(products) ? products : products?.data || [];
      const ordersList = Array.isArray(orders) ? orders : orders?.data || [];
      
      setStats({
        totalProducts: productList.length,
        availableProducts: productList.filter(p => p.isAvailable && p.stock > 0).length,
        outOfStock: productList.filter(p => !p.isAvailable || p.stock === 0).length,
        featuredProducts: productList.filter(p => p.isFeatured).length
      });

      setOrdersSeries(buildDailySeries(ordersList, 14));
    } catch (error) {
      console.error('Error fetching stats:', error);
      setOrdersSeries([]);
    } finally {
      setLoading(false);
      setOrdersSeriesLoading(false);
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.name || 'Admin'}!</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  whileHover={{ y: -2 }}
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
                </motion.div>
              );
            })}
          </div>

          {/* Orders Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-lg shadow-md p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Orders by Date</h2>
                <p className="text-sm text-gray-600">Last 14 days</p>
              </div>
            </div>

            <div className="h-72">
              {ordersSeriesLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-600">
                  Loading chart…
                </div>
              ) : ordersSeries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-600">
                  No order data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ordersSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickMargin={8} />
                    <YAxis allowDecimals={false} width={32} />
                    <Tooltip
                      formatter={(value) => [value, 'Orders']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
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
                onClick={() => navigate('/admin/orders')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
              >
                <h3 className="font-semibold text-gray-800">Manage Orders</h3>
                <p className="text-sm text-gray-600 mt-1">Track and fulfill customer orders</p>
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;

