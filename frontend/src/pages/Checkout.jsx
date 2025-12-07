// Checkout page component
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/Loader';
import { FiMapPin, FiPackage } from 'react-icons/fi';
import { placeOrder } from '../services/orderService';
import { toast } from '../components/ui/use-toast';

const DELIVERY_CHARGE = 50;

function Checkout() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { cartItems, clearCart } = useContext(CartContext);
  const orderPlacedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryType, setDeliveryType] = useState('Delivery');
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
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [user, navigate]);

  const computeItemPrice = (item) => {
    if (item.discount > 0) {
      return item.price - (item.price * item.discount) / 100;
    }
    return item.price;
  };

  const itemsPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + computeItemPrice(item) * item.quantity, 0);
  }, [cartItems]);

  const deliveryCharge = deliveryType === 'Delivery' ? DELIVERY_CHARGE : 0;
  const totalPrice = itemsPrice + deliveryCharge;

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
    }
    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    try {
      setLoading(true);

      const orderItems = cartItems.map(item => ({
        product: item._id,
        name: item.name,
        price: computeItemPrice(item),
        quantity: item.quantity,
        image: Array.isArray(item.images) ? item.images[0] : item.images
      }));

      const orderPayload = {
        orderItems,
        shippingAddress,
        paymentMethod,
        deliveryType,
        itemsPrice,
        deliveryCharge,
        totalPrice,
        paymentStatus: 'Pending',
        userLatitude: shippingAddress.location?.lat ?? null,
        userLongitude: shippingAddress.location?.lng ?? null
      };

      const response = await placeOrder(orderPayload);
      orderPlacedRef.current = true;
      const { data: order } = response;
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
                  <span>Home Delivery (₹50)</span>
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
                  {gpsSuccess && shippingAddress.location && (
                    <span className="text-green-600 text-sm">Location detected successfully</span>
                  )}
                </div>
                {shippingAddress.location && (
                  <div className="md:col-span-2 text-sm text-gray-700">
                    Detected: lat {shippingAddress.location.lat.toFixed(6)}, lng {shippingAddress.location.lng.toFixed(6)}
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
            <div className="border-t pt-2 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{itemsPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{deliveryType === 'Delivery' ? `₹${DELIVERY_CHARGE.toFixed(2)}` : 'Free'}</span>
              </div>
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
