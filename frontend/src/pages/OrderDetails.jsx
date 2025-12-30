import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import Loader from "../components/Loader";
import { getAdminThumbUrl } from '../lib/cloudinary.js';
import { getOrderDetails, submitOrderRatings } from "../services/orderService";
import OrderStatusTracker from "./OrderStatusTracker";
import LiveTrackingMap from "../components/LiveTrackingMap";
import { createSocket } from "../services/socket";

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
  const location = useLocation();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState('');

  const ratingRef = useRef(null);
  const [orderRating, setOrderRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [ratingSaved, setRatingSaved] = useState(false);

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

  const wantsRate = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      return params.get('rate') === '1';
    } catch {
      return false;
    }
  }, [location.search]);

  useEffect(() => {
    if (!order?._id) return;

    const canTrack =
      order.orderStatus === 'Out for Delivery' &&
      order.liveTrackingEnabled === true;

    if (!canTrack) {
      setTrackingActive(false);
      setTrackingMessage('');
      return;
    }

    const socket = createSocket();

    const join = () => {
      socket.emit('joinOrder', { orderId: order._id }, (ack) => {
        if (ack?.ok) {
          setTrackingActive(true);
          setTrackingMessage('Live tracking is active');
        } else {
          setTrackingActive(false);
          setTrackingMessage('Unable to join live tracking');
        }
      });
    };

    socket.on('connect', join);

    // Spec event (new)
    socket.on('delivery:location:update', (payload) => {
      if (!payload?.orderId || payload.orderId !== String(order._id)) return;
      if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;

      setLiveLocation({
        lat: payload.lat,
        lng: payload.lng,
        updatedAt: payload.updatedAt || payload.timestamp,
        speed: payload.speed,
        heading: payload.heading,
        accuracy: payload.accuracy,
      });
    });

    // Legacy event (backward compatibility)
    socket.on('orderLocationUpdate', (payload) => {
      if (!payload?.orderId || payload.orderId !== order._id) return;
      const loc = payload.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        setLiveLocation({
          lat: loc.lat,
          lng: loc.lng,
          updatedAt: loc.updatedAt,
        });
      }
    });

    socket.on('trackingStopped', (payload) => {
      if (!payload?.orderId || payload.orderId !== String(order._id)) return;
      setTrackingActive(false);
      setTrackingMessage('Tracking stopped');
    });

    socket.on('orderStatusUpdated', (payload) => {
      if (!payload?.orderId || payload.orderId !== String(order._id)) return;
      if (payload.orderStatus === 'Delivered') {
        setTrackingActive(false);
        setTrackingMessage('Order delivered');
      }
    });

    // Initial join if already connected
    if (socket.connected) join();

    return () => {
      try {
        socket.emit('leaveOrder', { orderId: order._id });
        socket.disconnect();
      } catch {}
    };
  }, [order?._id, order?.orderStatus, order?.liveTrackingEnabled]);

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

  useEffect(() => {
    if (!order?._id) return;

    const existingOrderRating = typeof order?.ratings?.order === 'number' ? order.ratings.order : 0;
    const existingDeliveryRating = typeof order?.ratings?.delivery === 'number' ? order.ratings.delivery : 0;
    setOrderRating(existingOrderRating);
    setDeliveryRating(existingDeliveryRating);
    setRatingSaved(Boolean(existingOrderRating && existingDeliveryRating));

    if (wantsRate) {
      setTimeout(() => {
        ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [order?._id, wantsRate]);

  const submitRatings = async () => {
    setRatingError('');
    if (orderRating < 1 || orderRating > 5 || deliveryRating < 1 || deliveryRating > 5) {
      setRatingError('Please select both ratings (1 to 5).');
      return;
    }
    try {
      setRatingSubmitting(true);
      await submitOrderRatings(order._id, { orderRating, deliveryRating });
      setRatingSaved(true);
      fetchOrder();
    } catch (e) {
      console.error('Submit rating failed', e);
      setRatingError(e?.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
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

  const customerLocation =
    shipping?.location && typeof shipping.location.lat === 'number' && typeof shipping.location.lng === 'number'
      ? {
          lat: shipping.location.lat,
          lng: shipping.location.lng,
        }
      : null;

  const initialLocation = order?.lastDeliveryLocation?.lat
    ? {
        lat: order.lastDeliveryLocation.lat,
        lng: order.lastDeliveryLocation.lng,
        updatedAt: order.lastDeliveryLocation.updatedAt,
      }
    : null;

  const displayLocation = liveLocation || initialLocation;

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

      {order?.orderStatus === 'Delivered' ? (
        <div ref={ratingRef} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Rate your order</h2>
            {ratingSaved ? (
              <span className="text-sm px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                Rated
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RatingBlock
              title="Order rating"
              value={orderRating}
              onChange={setOrderRating}
              disabled={ratingSaved || ratingSubmitting}
            />
            <RatingBlock
              title="Delivery rating"
              value={deliveryRating}
              onChange={setDeliveryRating}
              disabled={ratingSaved || ratingSubmitting}
            />
          </div>

          {ratingError ? <p className="text-sm text-red-600">{ratingError}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={submitRatings}
              disabled={ratingSaved || ratingSubmitting}
              className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {ratingSubmitting ? 'Submitting…' : ratingSaved ? 'Submitted' : 'Submit rating'}
            </button>
          </div>
        </div>
      ) : null}

      {(order.orderStatus === 'Out for Delivery' || order.liveTrackingEnabled) && (
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Tracking</h2>
            <span className="text-sm text-gray-600">
              {order.liveTrackingEnabled ? (trackingActive ? 'Active' : 'Unavailable') : 'Not enabled'}
            </span>
          </div>

          {trackingMessage && <p className="text-sm text-gray-600">{trackingMessage}</p>}

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            {order.assignedDeliveryBoy && (
              <div className="text-gray-700">
                <span className="font-semibold">Delivery boy:</span>{' '}
                {order.assignedDeliveryBoy.name}{order.assignedDeliveryBoy.phone ? ` (${order.assignedDeliveryBoy.phone})` : ''}
              </div>
            )}
            <div className="text-gray-700">
              <span className="font-semibold">Last update:</span>{' '}
              {displayLocation?.updatedAt ? new Date(displayLocation.updatedAt).toLocaleString() : '—'}
            </div>
          </div>

          {order.liveTrackingEnabled ? (
            displayLocation ? (
              <>
                <LiveTrackingMap
                  delivery={{
                    lat: displayLocation.lat,
                    lng: displayLocation.lng,
                    speed: liveLocation?.speed,
                    heading: liveLocation?.heading,
                    accuracy: liveLocation?.accuracy,
                    updatedAt: displayLocation?.updatedAt,
                  }}
                  customer={customerLocation}
                />
              </>
            ) : (
              <p className="text-sm text-gray-600">Waiting for the delivery location…</p>
            )
          ) : (
            <p className="text-sm text-gray-600">Tracking will appear once enabled by admin.</p>
          )}
        </div>
      )}

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
                  src={getAdminThumbUrl(imageSrc)}
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

function RatingBlock({ title, value, onChange, disabled }) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={disabled}
            className={
              (value >= n ? 'text-orange-500' : 'text-gray-300') +
              ' text-2xl leading-none px-1 disabled:opacity-60'
            }
            aria-label={`${title}: ${n} star`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Tap to rate (1–5)</p>
    </div>
  );
}
