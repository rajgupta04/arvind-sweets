// Order Tracking page component
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getMyOrders, getOrderById } from '../services/orderService';
import Loader from '../components/Loader';
import { FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';

function Orders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await getMyOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Placed':
        return <FiPackage className="w-5 h-5 text-blue-600" />;
      case 'Preparing':
        return <FiClock className="w-5 h-5 text-yellow-600" />;
      case 'Out for Delivery':
        return <FiTruck className="w-5 h-5 text-purple-600" />;
      case 'Delivered':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'Cancelled':
        return <FiXCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FiPackage className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Placed':
        return 'bg-blue-100 text-blue-800';
      case 'Preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Out for Delivery':
        return 'bg-purple-100 text-purple-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Order #{order._id.slice(-8).toUpperCase()}</h3>
                  <p className="text-sm text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-2 ${getStatusColor(order.orderStatus)}`}>
                  {getStatusIcon(order.orderStatus)}
                  <span>{order.orderStatus}</span>
                </span>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4 mb-4">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 mb-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Payment:</span> {order.paymentMethod}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Delivery:</span> {order.deliveryType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-orange-600">₹{order.totalPrice.toFixed(0)}</p>
                </div>
              </div>

              {/* Status Timeline */}
              {order.orderStatus !== 'Cancelled' && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-semibold mb-4">Order Status Timeline</h4>
                  <div className="flex items-center space-x-4">
                    {['Placed', 'Preparing', 'Out for Delivery', 'Delivered'].map((status, index) => {
                      const isCompleted = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered']
                        .indexOf(order.orderStatus) >= index;
                      const isCurrent = order.orderStatus === status;
                      
                      return (
                        <div key={status} className="flex items-center flex-1">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCompleted ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <p className={`text-xs mt-2 text-center ${isCurrent ? 'font-semibold' : ''}`}>
                              {status}
                            </p>
                          </div>
                          {index < 3 && (
                            <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-orange-600' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;

