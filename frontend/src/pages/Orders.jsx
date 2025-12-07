import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMyOrders } from "../services/orderService";
import { Link, useNavigate } from "react-router-dom";

const statusStyles = {
  Placed: "bg-gray-200 text-gray-700",
  Preparing: "bg-yellow-100 text-yellow-700",
  "Out for Delivery": "bg-blue-100 text-blue-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function MyOrders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/orders");
      return;
    }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const res = await getMyOrders();
      setOrders(res.data);
    } catch (error) {
      console.error("Failed to load orders", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <Link
          to="/products"
          className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="space-y-5">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white border rounded-lg shadow-sm p-5 flex items-center justify-between hover:shadow-md transition"
          >
            <div>
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-semibold text-gray-800">{order._id}</p>

              {order.estimatedDelivery && (
                <p className="text-sm text-gray-600 mt-1">
                  ETA:{" "}
                  <span className="font-medium text-gray-900">
                    {new Date(order.estimatedDelivery).toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-orange-600">
                ₹{order.totalPrice}
              </p>
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  statusStyles[order.orderStatus] || "bg-gray-200"
                }`}
              >
                {order.orderStatus}
              </span>
            </div>

            <Link
              to={`/orders/${order._id}`}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              View Details →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
