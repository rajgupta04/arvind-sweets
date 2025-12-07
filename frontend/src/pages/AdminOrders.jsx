// Admin Order Management page
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getAllOrders, updateOrderStatus } from '../services/orderService';
import Loader from '../components/Loader';
import { FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';

function AdminOrders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await getAllOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Orders</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">Order #{order._id.slice(-8).toUpperCase()}</h3>
                <p className="text-sm text-gray-600">
                  Customer: {order.user?.name || 'N/A'} ({order.user?.email || 'N/A'})
                </p>
                <p className="text-sm text-gray-600">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">₹{order.totalPrice.toFixed(0)}</p>
                <p className="text-sm text-gray-600">{order.paymentMethod} • {order.deliveryType}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t pt-4 mb-4">
              {order.orderItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 mb-2">
                  <p className="flex-1">{item.name} × {item.quantity}</p>
                  <p className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
              ))}
            </div>

            {/* Shipping Address */}
            {order.deliveryType === 'Delivery' && order.shippingAddress && (
              <div className="border-t pt-4 mb-4">
                <p className="font-semibold mb-2">Shipping Address:</p>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.name}, {order.shippingAddress.phone}<br />
                  {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
                {(order.shippingAddress.location || order.distanceKm != null || order.travelTimeMin != null || order.eta) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3 rounded">
                    {order.shippingAddress.location && (
                      <div>
                        <p className="text-sm text-gray-700"><span className="font-medium">GPS:</span> {order.shippingAddress.location.lat}, {order.shippingAddress.location.lng}</p>
                        <a
                          href={`https://www.google.com/maps?q=${order.shippingAddress.location.lat},${order.shippingAddress.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 text-sm hover:text-orange-700"
                        >Open in Google Maps</a>
                      </div>
                    )}
                    {order.distanceKm != null && (
                      <p className="text-sm text-gray-700"><span className="font-medium">Distance:</span> {order.distanceKm} km</p>
                    )}
                    {order.travelTimeMin != null && (
                      <p className="text-sm text-gray-700"><span className="font-medium">Travel Time:</span> {order.travelTimeMin} min</p>
                    )}
                    {order.eta && (
                      <p className="text-sm text-gray-700"><span className="font-medium">ETA:</span> {new Date(order.eta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status Management */}
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-800' :
                  order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.orderStatus}
                </span>
              </div>
              <div className="flex space-x-2">
                {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && (
                  <>
                    {order.orderStatus === 'Placed' && (
                      <button
                        onClick={() => handleStatusChange(order._id, 'Preparing')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Mark as Preparing
                      </button>
                    )}
                    {order.orderStatus === 'Preparing' && (
                      <button
                        onClick={() => handleStatusChange(order._id, 'Out for Delivery')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Out for Delivery
                      </button>
                    )}
                    {order.orderStatus === 'Out for Delivery' && (
                      <button
                        onClick={() => handleStatusChange(order._id, 'Delivered')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(order._id, 'Cancelled')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Cancel Order
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;
