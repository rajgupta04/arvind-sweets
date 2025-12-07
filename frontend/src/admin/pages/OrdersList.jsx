import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { getAllOrders, updateOrderStatus } from '../services/adminApi';
import { FiEye, FiX } from 'react-icons/fi';

const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Placed', 'Preparing', 'Out for Delivery'];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function OrdersList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const audioRef = useRef(null);
  const lastOrderIdRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    audioRef.current = new Audio('/order-notification.mp3');
    audioRef.current.load();
  }, []);

  const triggerBrowserNotification = (order) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const notify = () => {
      try {
        new Notification('New Order!', {
          body: `Order ID: ${order._id}`,
          tag: order._id
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

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleIncomingOrder = (order) => {
    if (!order) return;
    showToast(`New Order Received: ${order._id}`);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    triggerBrowserNotification(order);
    fetchOrders(true);
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getAllOrders();
      setOrders(data);

      if (data.length > 0) {
        const latestId = data[0]._id;
        if (initializedRef.current && latestId !== lastOrderIdRef.current) {
          handleIncomingOrder(data[0]);
        }
        lastOrderIdRef.current = latestId;
        if (!initializedRef.current) {
          initializedRef.current = true;
        }
      }
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleNewOrderEvent = (event) => {
      if (event.detail?._id) {
        lastOrderIdRef.current = event.detail._id;
        initializedRef.current = true;
      }
      handleIncomingOrder(event.detail);
    };

    window.addEventListener('admin:new-order', handleNewOrderEvent);
    return () => window.removeEventListener('admin:new-order', handleNewOrderEvent);
  }, []);

  const handleStatusChange = async (orderId, status) => {
    try {
      setUpdatingStatusId(orderId);
      await updateOrderStatus(orderId, status);
      showToast(`Order ${orderId} status updated to ${status}`);
      fetchOrders(true);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setShowModal(false);
  };

  const renderStatusBadge = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Processing: 'bg-blue-100 text-blue-800',
      Shipped: 'bg-purple-100 text-purple-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
              <p className="text-gray-600 mt-2">Track, manage, and fulfill incoming orders.</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{order._id}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.shippingAddress?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{order.user?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(order.totalPrice)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{order.paymentMethod}</td>
                        <td className="px-6 py-4">{renderStatusBadge(order.paymentStatus || 'Pending')}</td>
                        <td className="px-6 py-4">
                          <select
                            value={order.orderStatus}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="border rounded-lg px-3 py-1 text-sm"
                            disabled={updatingStatusId === order._id}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => openModal(order)}
                            className="inline-flex items-center space-x-1 px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-100"
                          >
                            <FiEye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-24 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-xl font-semibold">Order Details - {selectedOrder._id}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Customer</h4>
                  <p className="text-gray-800">{selectedOrder.shippingAddress?.name}</p>
                  <p className="text-gray-600">{selectedOrder.user?.email}</p>
                  <p className="text-gray-600">{selectedOrder.shippingAddress?.phone}</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Shipping</h4>
                  <p className="text-gray-800">{selectedOrder.shippingAddress?.street}</p>
                  <p className="text-gray-600">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                    {selectedOrder.shippingAddress?.pincode}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.orderItems?.map((item) => (
                    <div key={`${selectedOrder._id}-${item.product || item.name}`} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items Price</span>
                  <span>{formatCurrency(selectedOrder.itemsPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>{formatCurrency(selectedOrder.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersList;

