// Checkout page component
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import Loader from '../components/Loader';
import { FiMapPin, FiPackage } from 'react-icons/fi';

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useContext(CartContext);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryType, setDeliveryType] = useState('Delivery');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  React.useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      alert('Please fill in all address fields');
      return;
    }

    try {
      setLoading(true);
      
      // Create order summary (stored locally - no backend needed)
      const orderSummary = {
        orderItems: cartItems.map(item => ({
          name: item.name,
          price: item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price,
          quantity: item.quantity,
          total: (item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price) * item.quantity
        })),
        shippingAddress,
        paymentMethod,
        deliveryType,
        itemsPrice: getCartTotal(),
        deliveryCharge: deliveryType === 'Delivery' ? 50 : 0,
        totalPrice: getCartTotal() + (deliveryType === 'Delivery' ? 50 : 0),
        orderDate: new Date().toISOString(),
        orderId: 'ORD-' + Date.now()
      };

      // Save to localStorage for reference
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.push(orderSummary);
      localStorage.setItem('orders', JSON.stringify(orders));

      clearCart();
      alert(`Order placed successfully! Order ID: ${orderSummary.orderId}`);
      navigate('/');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to place order. Please try again.');
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

            {/* Shipping Address */}
            {deliveryType === 'Delivery' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
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
                </div>
              </div>
            )}

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
                const discountedPrice = item.discount > 0
                  ? item.price - (item.price * item.discount / 100)
                  : item.price;
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
                <span>₹{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{deliveryType === 'Delivery' ? '₹50.00' : 'Free'}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-orange-600">₹{(getCartTotal() + (deliveryType === 'Delivery' ? 50 : 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
