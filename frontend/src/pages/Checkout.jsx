// Checkout page component
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/Loader';
import { FiMapPin, FiPackage } from 'react-icons/fi';
import { placeOrder } from '../services/orderService';
import { toast } from '../components/ui/use-toast';
import { listMyAddresses, upsertMyAddress } from '../services/addressService';
import LocationPickerMap from '../components/LocationPickerMap';
import { validateCoupon } from '../services/couponService';

import { getPublicSettings } from '../services/settingsService';

function haversineDistanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
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

function computeRangeDeliveryCharge({ itemsPrice, distanceKm, rule, rounding }) {
  const includedKm = Number(rule?.includedKm) || 0;
  const freeAboveAmount = Number(rule?.freeAboveAmount) || 0;
  const perKmCharge = Number(rule?.perKmCharge) || 0;

  if (itemsPrice >= freeAboveAmount) return 0;
  const extraKm = Math.max(0, distanceKm - includedKm);
  if (extraKm <= 0) return 0;

  const extra = rounding === 'exact' ? extraKm : Math.ceil(extraKm);
  const charge = extra * perKmCharge;
  return Math.max(0, Math.round(charge));
}

function Checkout() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { cartItems, clearCart } = useContext(CartContext);
  const orderPlacedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [publicSettings, setPublicSettings] = useState(null);
  const [publicSettingsLoaded, setPublicSettingsLoaded] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    location: null
  });
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('');
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  const hydratedDefaultAddressRef = useRef(false);

  useEffect(() => {
    if (!orderPlacedRef.current && cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  useEffect(() => {
    if (user && shippingAddress.name === '' && shippingAddress.phone === '') {
      setShippingAddress((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || ''
      }));
    }
  }, [user, shippingAddress.name, shippingAddress.phone]);

  useEffect(() => {
    // Auth is enforced by <ProtectedRoute> in App routing.
    // Avoid redirecting during refresh while auth is still bootstrapping.
  }, []);

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;
      try {
        setAddressesLoading(true);
        const list = await listMyAddresses();
        setSavedAddresses(Array.isArray(list) ? list : []);

        if (hydratedDefaultAddressRef.current) return;
        hydratedDefaultAddressRef.current = true;

        const defaultAddr = Array.isArray(list) ? list.find((a) => a?.isDefault) : null;
        const hasAnyShippingText = Boolean(
          shippingAddress.street || shippingAddress.city || shippingAddress.state || shippingAddress.pincode
        );

        if (defaultAddr && !hasAnyShippingText) {
          setSelectedSavedAddressId(String(defaultAddr._id || ''));
          setShippingAddress((prev) => ({
            ...prev,
            name: defaultAddr.name || prev.name,
            phone: defaultAddr.phone || prev.phone,
            street: defaultAddr.street || '',
            city: defaultAddr.city || '',
            state: defaultAddr.state || '',
            pincode: defaultAddr.pincode || '',
            location: defaultAddr.location?.lat && defaultAddr.location?.lng ? defaultAddr.location : prev.location,
          }));
          setGpsSuccess(Boolean(defaultAddr.location?.lat && defaultAddr.location?.lng));
        }
      } catch {
        setSavedAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    };

    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectSavedAddress = (id) => {
    const nextId = String(id || '');
    setSelectedSavedAddressId(nextId);
    if (!nextId) return;

    const found = savedAddresses.find((a) => String(a?._id) === nextId);
    if (!found) return;

    setShippingAddress((prev) => ({
      ...prev,
      name: found.name || prev.name,
      phone: found.phone || prev.phone,
      street: found.street || '',
      city: found.city || '',
      state: found.state || '',
      pincode: found.pincode || '',
      location:
        found.location && typeof found.location.lat === 'number' && typeof found.location.lng === 'number'
          ? found.location
          : prev.location,
    }));
    setGpsSuccess(Boolean(found.location?.lat && found.location?.lng));
  };

  const maybeAutoSaveAddress = async ({ setDefault } = {}) => {
    if (!user) return;
    if (deliveryType !== 'Delivery') return;
    if (!saveThisAddress) return;

    const payload = {
      label: '',
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      pincode: shippingAddress.pincode,
      location: shippingAddress.location || null,
      setDefault: Boolean(setDefault),
    };

    try {
      const createdOrUpdated = await upsertMyAddress(payload);
      try {
        const list = await listMyAddresses();
        setSavedAddresses(Array.isArray(list) ? list : []);
        if (createdOrUpdated?._id) {
          setSelectedSavedAddressId(String(createdOrUpdated._id));
        }
      } catch {}
    } catch {
      // Silent: order placement should not fail if saving address fails
    }
  };

  const computeItemPrice = (item) => {
    if (item?.isGift) return 0;
    if (item.discount > 0) {
      return item.price - (item.price * item.discount) / 100;
    }
    return item.price;
  };

  const itemsPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + computeItemPrice(item) * item.quantity, 0);
  }, [cartItems]);

  const mrpItemsPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const deliveryCharge = useMemo(() => {
    if (deliveryType !== 'Delivery') return 0;

    const roundedItemsPrice = Math.round(itemsPrice * 100) / 100;
    const dr = publicSettings?.deliveryRange;
    const shop = publicSettings?.shop;
    const hasRange = Boolean(dr?.enabled) && Array.isArray(dr?.rules) && dr.rules.length > 0;

    const uLat = shippingAddress.location?.lat;
    const uLng = shippingAddress.location?.lng;
    const sLat = shop?.lat;
    const sLng = shop?.lng;

    if (
      hasRange &&
      typeof uLat === 'number' && typeof uLng === 'number' &&
      typeof sLat === 'number' && typeof sLng === 'number'
    ) {
      const distanceKm = Number(haversineDistanceKm(sLat, sLng, uLat, uLng).toFixed(2));
      const rule = pickActiveRangeRule(dr);
      if (!rule) return 0;
      const maxKm = Number(rule?.maxKm);
      if (Number.isFinite(maxKm) && distanceKm > maxKm + 1e-6) return 0;
      return computeRangeDeliveryCharge({
        itemsPrice: roundedItemsPrice,
        distanceKm,
        rule,
        rounding: dr?.rounding || 'ceil',
      });
    }

    // Avoid showing legacy ₹50/₹250 when backend uses range rules.
    if (!publicSettingsLoaded) return 0;
    return 0;
  }, [deliveryType, itemsPrice, publicSettings, publicSettingsLoaded, shippingAddress.location]);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getPublicSettings();
        setPublicSettings(s || null);
      } catch {
        setPublicSettings(null);
      } finally {
        setPublicSettingsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // If cart/delivery changes, re-apply should happen explicitly.
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPrice, deliveryType]);

  const discountAmount = appliedCoupon?.discountAmount ? Number(appliedCoupon.discountAmount) : 0;
  const totalPrice = Math.max(0, itemsPrice + deliveryCharge - discountAmount);
  const hasDiscount = mrpItemsPrice - itemsPrice > 0.009;

  const handleApplyCoupon = async () => {
    const code = String(couponCode || '').trim();
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    try {
      setCouponApplying(true);
      setCouponError('');
      const res = await validateCoupon({ code, itemsPrice });
      const discount = Number(res?.discountAmount) || 0;
      if (!res?.valid || discount <= 0) {
        setAppliedCoupon(null);
        setCouponError('Coupon is not valid');
        return;
      }
      setAppliedCoupon({
        code: res?.coupon?.code || code.toUpperCase(),
        discountAmount: discount,
        coupon: res?.coupon || null,
      });
      setCouponError('');
      toast({ title: 'Coupon applied', description: `Discount: ₹${discount.toFixed(2)}` });
    } catch (e) {
      setAppliedCoupon(null);
      setCouponError(e?.response?.data?.message || 'Failed to apply coupon');
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.name || !shippingAddress.phone) {
      alert('Please provide your name and phone number.');
      return;
    }
    if (deliveryType === 'Delivery') {
      if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        alert('Please fill in the full delivery address.');
        return;
      }

      if (typeof shippingAddress.location?.lat !== 'number' || typeof shippingAddress.location?.lng !== 'number') {
        alert('Please select your location on the map (Use My Location is required).');
        setShowMapPicker(true);
        return;
      }
    }
    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    try {
      setLoading(true);

      const orderItems = cartItems.map(item => ({
        product: item?.isGift ? item?.product : item._id,
        name: item.name,
        price: computeItemPrice(item),
        quantity: item.quantity,
        image: Array.isArray(item.images) ? item.images[0] : item.images,
        isGift: Boolean(item?.isGift)
      }));

      const orderPayload = {
        orderItems,
        shippingAddress,
        paymentMethod,
        deliveryType,
        itemsPrice,
        deliveryCharge,
        totalPrice,
        couponCode: appliedCoupon?.coupon?.code || appliedCoupon?.code || '',
        paymentStatus: 'Pending',
        userLatitude: shippingAddress.location?.lat ?? null,
        userLongitude: shippingAddress.location?.lng ?? null
      };

      const response = await placeOrder(orderPayload);
      orderPlacedRef.current = true;
      const { data: order } = response;

      await maybeAutoSaveAddress({ setDefault: savedAddresses.length === 0 });

      clearCart();
      navigate(`/order-success/${order._id}`, { state: { orderId: order._id, total: order.totalPrice } });
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Delivery Type */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Delivery Option</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="Delivery"
                    checked={deliveryType === 'Delivery'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="w-5 h-5 text-orange-600"
                  />
                  <FiMapPin className="w-5 h-5" />
                  <span>Home Delivery (charges based on distance/time)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="Pickup"
                    checked={deliveryType === 'Pickup'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="w-5 h-5 text-orange-600"
                  />
                  <FiPackage className="w-5 h-5" />
                  <span>Pickup from Store (Free)</span>
                </label>
              </div>
            </div>

            {/* Contact & Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Contact & Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Saved addresses</label>
                  <select
                    value={selectedSavedAddressId}
                    onChange={(e) => handleSelectSavedAddress(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={addressesLoading || savedAddresses.length === 0}
                  >
                    <option value="">
                      {addressesLoading
                        ? 'Loading…'
                        : savedAddresses.length === 0
                          ? 'No saved addresses'
                          : 'Select a saved address'}
                    </option>
                    {savedAddresses.map((a) => {
                      const label = a?.label ? String(a.label) : '';
                      const primary = label || a?.street || '';
                      const secondary = [a?.city, a?.state, a?.pincode].filter(Boolean).join(', ');
                      const suffix = a?.isDefault ? ' (Default)' : '';
                      return (
                        <option key={a._id} value={a._id}>
                          {primary}{secondary ? ` — ${secondary}` : ''}{suffix}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Full Name"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={shippingAddress.phone}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <div className="md:col-span-2 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast({ title: 'Location error', description: 'Geolocation is not supported', variant: 'destructive' });
                        setGpsSuccess(false);
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude, longitude } = pos.coords;
                          setShippingAddress({ ...shippingAddress, location: { lat: latitude, lng: longitude } });
                          setGpsSuccess(true);
                        },
                        (err) => {
                          toast({ title: 'Location error', description: err.message || 'Failed to detect location', variant: 'destructive' });
                          setGpsSuccess(false);
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Use My Location
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker((v) => !v)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                  </button>

                  {gpsSuccess && shippingAddress.location && (
                    <span className="text-green-600 text-sm">Location detected successfully</span>
                  )}
                </div>

                {showMapPicker ? (
                  <div className="md:col-span-2">
                    <LocationPickerMap
                      value={shippingAddress.location}
                      onChange={(loc) => {
                        setShippingAddress((prev) => ({ ...prev, location: loc }));
                        setGpsSuccess(Boolean(loc?.lat && loc?.lng));
                      }}
                      height={260}
                    />
                  </div>
                ) : null}

                {deliveryType === 'Delivery' && (
                  <div className="md:col-span-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={saveThisAddress}
                        onChange={(e) => setSaveThisAddress(e.target.checked)}
                      />
                      Save this address for next time
                    </label>
                  </div>
                )}

                {deliveryType === 'Delivery' && (
                  <>
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 md:col-span-2"
                      required
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={shippingAddress.pincode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-orange-600"
                />
                <span>Cash on Delivery (COD)</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Place Order
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {cartItems.map((item) => {
                const discountedPrice = computeItemPrice(item);
                return (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{(discountedPrice * item.quantity).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-gray-800 mb-2">Have a coupon?</div>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={couponApplying}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60"
                    disabled={couponApplying}
                  >
                    {couponApplying ? 'Applying…' : 'Apply'}
                  </button>
                )}
              </div>
              {couponError ? <div className="mt-2 text-sm text-red-600">{couponError}</div> : null}
              {appliedCoupon ? (
                <div className="mt-2 text-xs text-green-700">
                  Applied: <span className="font-semibold">{appliedCoupon.code}</span>
                </div>
              ) : null}
            </div>

            <div className="border-t pt-2 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-right">
                  {hasDiscount ? (
                    <>
                      <span className="text-sm text-gray-500 line-through mr-2">₹{mrpItemsPrice.toFixed(2)}</span>
                      <span>₹{itemsPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span>₹{itemsPrice.toFixed(2)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>
                  {deliveryType !== 'Delivery'
                    ? 'Free'
                    : (deliveryCharge === 0 ? <span className="text-green-700">Free</span> : `₹${deliveryCharge.toFixed(2)}`)}
                </span>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between text-green-700">
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-orange-600">₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
