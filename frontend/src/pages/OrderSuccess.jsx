import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import { getOrderDetails } from '../services/orderService';
import { getAdminThumbUrl } from '../lib/cloudinary.js';
import { getPublicSettings } from '../services/settingsService';

const DEFAULT_DELIVERY_CHARGE = 50;

function formatMoney(n) {
  const v = Number(n) || 0;
  return `₹${v.toFixed(2)}`;
}

function timeToMinutes(hhmm) {
  const m = String(hhmm || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function nowMinutesInTimeZone(timeZone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const min = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
  } catch {
    return null;
  }
}

function isNowInWindow(nowMin, startMin, endMin) {
  if (nowMin == null || startMin == null || endMin == null) return false;
  if (startMin === endMin) return true;
  if (endMin > startMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

function pickActiveRangeRule(deliveryRange) {
  const tz = deliveryRange?.timezone || 'Asia/Kolkata';
  const nowMin = nowMinutesInTimeZone(tz);
  const rules = Array.isArray(deliveryRange?.rules) ? deliveryRange.rules : [];
  for (const r of rules) {
    const s = timeToMinutes(r?.startTime);
    const e = timeToMinutes(r?.endTime);
    if (isNowInWindow(nowMin, s, e)) return r;
  }
  return null;
}

function OrderSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [publicSettings, setPublicSettings] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || order) return;
      try {
        const response = await getOrderDetails(id);
        setOrder(response.data);
      } catch (error) {
        console.error('Failed to load order', error);
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, order, navigate]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getPublicSettings();
        setPublicSettings(s || null);
      } catch {
        setPublicSettings(null);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <Loader />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const formatETA = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const date = d.toLocaleDateString();
      return { time, date };
    } catch {
      return null;
    }
  };
  const etaTarget = order?.estimatedDelivery || order?.eta || null;
  const etaInfo = etaTarget ? formatETA(etaTarget) : null;

  const deliveryInfo = (() => {
    if (!order || order?.deliveryType !== 'Delivery') return null;
    const total = Number(order?.deliveryCharge) || 0;
    if (total <= 0) {
      return { isFree: true, total: 0 };
    }

    const itemsPrice = Number(order?.itemsPrice) || 0;
    const freeGoalEnabled = publicSettings?.cartGoals?.freeDelivery?.enabled !== false;
    const freeThreshold = Number(publicSettings?.cartGoals?.freeDelivery?.threshold) || 250;
    const qualifies = freeGoalEnabled && itemsPrice >= freeThreshold;
    if (qualifies) {
      return { isFree: true, total: 0, freeThreshold };
    }

    const rule = pickActiveRangeRule(publicSettings?.deliveryRange);
    const perKmCharge = Number(rule?.perKmCharge) || null;

    const base = DEFAULT_DELIVERY_CHARGE;
    const distanceCharge = Math.max(0, Math.round(total - base));
    const extraKm = perKmCharge ? Math.round(distanceCharge / perKmCharge) : null;

    return {
      isFree: false,
      total,
      freeThreshold,
      base,
      distanceCharge,
      extraKm,
    };
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* top banner */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 text-white px-6 sm:px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] mb-3">Order confirmed</p>
            <h1 className="text-4xl font-extrabold leading-tight">
              Thank you for your order, <span className="text-amber-100">{order.shippingAddress?.name || 'foodie'}</span>!
            </h1>
            <p className="mt-3 text-lg text-orange-50">
              We’re rolling, glazing and packing your sweets.
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-4 text-white text-sm">
            <p className="uppercase text-xs text-white/70">Estimated Delivery</p>
            {etaInfo ? (
              <>
                <p className="text-xl font-semibold mt-1">{etaInfo.time}</p>
                <p className="text-xs text-white/80 mt-1">{etaInfo.date}</p>
              </>
            ) : (
              <p className="text-xl font-semibold mt-1">Calculating...</p>
            )}
            {(order?.distanceKm != null) && ((order?.travelTimeMin != null) || (order?.deliveryTimeMinutes != null)) && (
              <div className="mt-3 text-white/90">
                <p>Distance: {order.distanceKm} km</p>
                <p>Travel Time: {(order.travelTimeMin ?? order.deliveryTimeMinutes)} min</p>
              </div>
            )}
          </div>
        </div>

        {/* confirmation card */}
        <div className="-mt-16 px-4 sm:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono text-lg text-gray-900">{order._id}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">₹{order.totalPrice?.toFixed(2)}</p>
                {deliveryInfo && order?.deliveryType === 'Delivery' ? (
                  <div className="mt-2 text-xs text-gray-600">
                    {deliveryInfo.isFree ? (
                      <span className="text-green-700">Delivery: Free</span>
                    ) : (
                      <div>
                        <div>Delivery: {formatMoney(deliveryInfo.total)}</div>
                        <div className="text-[11px] text-gray-500">
                          Standard {formatMoney(deliveryInfo.base)} (below {formatMoney(deliveryInfo.freeThreshold)})
                          {deliveryInfo.distanceCharge > 0 ? (
                            <> • {formatMoney(deliveryInfo.distanceCharge)}{deliveryInfo.extraKm != null ? ` (for ${deliveryInfo.extraKm} extra km)` : ''}</>
                          ) : (
                            <> • {formatMoney(0)} (no extra km)</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={`/orders/${order._id}`}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-600 text-white font-semibold shadow-lg shadow-orange-200 hover:bg-orange-700 transition"
              >
                Track this order
              </Link>
              <Link
                to="/orders"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition"
              >
                View all orders
              </Link>
            </div>
          </div>
        </div>

        {/* items snapshot */}
        <div className="px-6 sm:px-10 pb-10 pt-6 border-t border-gray-100 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What’s on its way</h2>
          {order?.shippingAddress?.location && (
            <div className="mb-4 text-sm">
              <span className="font-medium">Your Location: </span>
              <a
                href={`https://www.google.com/maps?q=${order.shippingAddress.location.lat},${order.shippingAddress.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-orange-600 hover:text-orange-700"
              >
                Open in Google Maps
              </a>
            </div>
          )}
          <div className="space-y-4">
            {order.orderItems.slice(0, 3).map((item) => (
              <div key={item.product || item._id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {item.image && (
                    <img src={getAdminThumbUrl(item.image)} alt={item.name} className="w-14 h-14 rounded-xl object-cover border" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-gray-800">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </p>
              </div>
            ))}
            {order.orderItems.length > 3 && (
              <p className="text-sm text-gray-500">+ {order.orderItems.length - 3} more items</p>
            )}
          </div>
        </div>

        {/* bottom CTAs */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 sm:px-10 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="text-gray-900 font-semibold">Need to tweak delivery or gifting details?</p>
            <p className="text-sm text-gray-600">Call us at +91 91361 92636 or reply to the confirmation email.</p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-gray-300 bg-white text-gray-800 font-semibold hover:border-orange-500 hover:text-orange-600 transition"
          >
            Explore more treats
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccess;
