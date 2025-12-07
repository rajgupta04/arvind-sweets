import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import Loader from "../components/Loader";
import { getOrderDetails } from "../services/orderService";
import OrderStatusTracker from "./OrderStatusTracker";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function OrderDetails() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { addToCart, updateQuantity } = useContext(CartContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/orders");
      return;
    }
    try {
      const cached = localStorage.getItem(`order_${id}`);
      if (cached) {
        setOrder(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
    fetchOrder();
  }, [user, id]);

  const fetchOrder = async () => {
    try {
      const response = await getOrderDetails(id);
      setOrder(response.data);
      try {
        localStorage.setItem(`order_${id}`, JSON.stringify(response.data));
      } catch {}
    } catch (error) {
      console.error("Failed to fetch order", error);
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatOrder = () => {
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

  if (authLoading) return <Loader />;
  if (!order) return null;

  const shipping = order.shippingAddress || {};

  // ETA extraction
  const etaDate = order?.estimatedDelivery ? new Date(order.estimatedDelivery) : null;

  const etaTime = etaDate
    ? etaDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  const etaDay = etaDate ? etaDate.toLocaleDateString() : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* ---------------------------------------------------------------- */}
      {/* 🔥 THANK YOU + ETA BANNER */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 text-white rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-extrabold">
          Thank you for your order,{" "}
          <span className="text-amber-100">{shipping.name || "Customer"}</span>!
        </h1>

        <p className="mt-2 text-orange-50 text-lg">
          We're preparing your sweets — your order is currently{" "}
          <span className="font-semibold">{order.orderStatus}</span>.
        </p>

        {/* ETA BOX */}
        <div className="mt-6 bg-white/15 backdrop-blur rounded-2xl px-5 py-4 w-fit text-sm">
          <p className="uppercase text-xs text-white/70">Estimated Delivery</p>

          {etaTime ? (
            <>
              <p className="text-xl font-semibold mt-1">{etaTime}</p>
              <p className="text-xs text-white/80 mt-1">{etaDay}</p>

              {(order.distanceKm || order.deliveryTimeMinutes) && (
                <div className="mt-3 text-white/90 space-y-1">
                  {order.distanceKm && <p>Distance: {order.distanceKm} km</p>}
                  {order.deliveryTimeMinutes && (
                    <p>Travel Time: {order.deliveryTimeMinutes} min</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xl font-semibold mt-1">Calculating...</p>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ORDER STATUS TRACKER */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Order Status</h2>
        <OrderStatusTracker currentStatus={order.orderStatus?.toLowerCase()} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SHIPPING + PAYMENT GRID */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SHIPPING */}
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <h3 className="text-lg font-semibold mb-3">Shipping Details</h3>
          <p className="text-gray-900 font-medium">{shipping.name}</p>
          <p className="text-gray-600">{shipping.phone}</p>

          {shipping.street && (
            <>
              <p className="text-gray-600">{shipping.street}</p>
              <p className="text-gray-600">
                {shipping.city}, {shipping.state} {shipping.pincode}
              </p>
            </>
          )}

          {shipping.location?.lat && (
            <a
              href={`https://www.google.com/maps?q=${shipping.location.lat},${shipping.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:text-orange-700 text-sm"
            >
              Open Location in Google Maps →
            </a>
          )}
        </div>

        {/* PAYMENT */}
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <h3 className="text-lg font-semibold mb-3">Payment</h3>
          <p className="text-gray-600">
            <span className="font-medium text-gray-900">Method:</span> {order.paymentMethod}
          </p>
          <p className="text-gray-600">
            <span className="font-medium text-gray-900">Payment Status:</span> {order.paymentStatus}
          </p>
          <p className="text-gray-600">
            <span className="font-medium text-gray-900">Delivery Type:</span> {order.deliveryType}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ITEMS WITH IMAGES FIXED */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Items</h3>

        <div className="divide-y">
          {order.orderItems.map((item) => {
            const imageSrc =
              item.image ||
              item.images?.[0] ||
              "/placeholder.png";

            return (
              <div
                key={item.product || item._id}
                className="py-4 flex items-center justify-between"
              >
                {/* IMAGE */}
                <img
                  src={imageSrc}
                  alt={item.name}
                  className="w-16 h-16 rounded object-cover border mr-4"
                />

                {/* INFO */}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    Qty: {item.quantity} × ₹{item.price}
                  </p>
                </div>

                {/* PRICE */}
                <p className="font-semibold min-w-[80px] text-right">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SUMMARY */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <h3 className="text-lg font-semibold mb-4">Summary</h3>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Items Total</span>
          <span>{formatCurrency(order.itemsPrice)}</span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery Charge</span>
          <span>{formatCurrency(order.deliveryCharge)}</span>
        </div>

        <div className="flex justify-between text-lg font-bold border-t pt-3">
          <span>Total Paid</span>
          <span className="text-orange-600">
            {formatCurrency(order.totalPrice)}
          </span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRepeatOrder}
            className="w-full sm:w-auto bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
          >
            Repeat Order
          </button>
          <button
            onClick={() => navigate('/products')}
            className="w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
