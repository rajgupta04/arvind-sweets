import React, { useEffect, useMemo, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { getAdminThumbUrl } from "../lib/cloudinary.js";
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
  const { addToCart, updateQuantity } = useContext(CartContext);
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

  const formatOrderDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    // Example: 20 Dec, 10:44 pm
    const dayMonth = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    return `${dayMonth}, ${time}`;
  };

  const getPrimaryStatus = (order) => {
    const raw = String(order?.orderStatus || '').trim();
    return raw || 'Pending';
  };

  const getHeadline = (order) => {
    const status = getPrimaryStatus(order);
    const deliveredAt = order?.deliveredAt ? new Date(order.deliveredAt) : null;
    const startedAt = order?.deliveryStartedAt ? new Date(order.deliveryStartedAt) : null;
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;

    if (status === 'Delivered' && deliveredAt && !Number.isNaN(deliveredAt.getTime())) {
      const base = startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : createdAt;
      if (base && !Number.isNaN(base.getTime())) {
        const minutes = Math.max(1, Math.round((deliveredAt.getTime() - base.getTime()) / 60000));
        return `Arrived in ${minutes} minutes`;
      }
      return 'Delivered';
    }

    const eta = order?.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
    if (eta && !Number.isNaN(eta.getTime())) {
      const diffMin = Math.round((eta.getTime() - Date.now()) / 60000);
      if (diffMin > 0) return `Arriving in ${diffMin} minutes`;
    }

    if (status === 'Out for Delivery') return 'On the way';
    if (status === 'Preparing' || status === 'Processing') return 'Being prepared';
    if (status === 'Placed') return 'Order placed';
    return status;
  };

  const handleReorder = (order) => {
    if (!order || !Array.isArray(order.orderItems)) return;
    order.orderItems.forEach((item) => {
      const productObj = {
        _id: item.product || item._id,
        name: item.name,
        price: item.price,
        images: item.image ? [item.image] : (item.images || []),
        discount: 0,
      };
      addToCart(productObj);
      updateQuantity(productObj._id, item.quantity);
    });
    navigate('/checkout');
  };

  const resolvedOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Back"
          >
            <span className="text-xl leading-none">←</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold">Your orders</h1>
        </div>

        <Link
          to="/products"
          className="hidden sm:inline-flex px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="space-y-5">
        {resolvedOrders.length === 0 ? (
          <div className="bg-white border rounded-2xl p-6 text-center text-gray-600">
            Start shopping to see your orders here.
          </div>
        ) : (
          resolvedOrders.map((order) => {
            const status = getPrimaryStatus(order);
            const headline = getHeadline(order);
            const when = formatOrderDate(order?.createdAt);
            const price = Number(order?.totalPrice || 0);
            const thumbs = Array.isArray(order?.orderItems)
              ? order.orderItems.map((it) => it?.image).filter(Boolean)
              : [];
            const badgeClass = statusStyles[status] || 'bg-gray-200 text-gray-700';

            return (
              <div key={order._id} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        status === 'Delivered'
                          ? 'w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold'
                          : 'w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold'
                      }
                      aria-hidden
                    >
                      {status === 'Delivered' ? '✓' : '⏱'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{headline}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            ₹{price} {when ? <span className="text-gray-400">•</span> : null} {when}
                          </p>
                        </div>

                        <span className={`shrink-0 px-3 py-1 text-xs rounded-full ${badgeClass}`}>{status}</span>
                      </div>

                      {thumbs.length > 0 ? (
                        <div className="mt-3 flex items-center gap-2">
                          {thumbs.slice(0, 4).map((src, idx) => (
                            <img
                              key={`${order._id}_thumb_${idx}`}
                              src={getAdminThumbUrl(src)}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover border bg-gray-50"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t bg-white">
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="py-3 text-sm font-medium text-green-700 hover:bg-gray-50"
                  >
                    Reorder
                  </button>
                  {status === 'Delivered' ? (
                    <Link
                      to={`/orders/${order._id}?rate=1`}
                      className="py-3 text-sm font-medium text-green-700 hover:bg-gray-50 text-center"
                    >
                      Rate order
                    </Link>
                  ) : (
                    <div className="py-3 text-sm font-medium text-gray-400 text-center cursor-not-allowed bg-gray-50">
                      Rate order
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
