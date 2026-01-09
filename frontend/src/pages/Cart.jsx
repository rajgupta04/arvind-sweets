// Cart page component
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { getProductCardThumbUrl } from '../lib/cloudinary.js';
import { getProducts } from '../services/productService';

const DELIVERY_CHARGE = 50;
const FREE_DELIVERY_THRESHOLD = 250;

function Cart() {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  const [showConfetti, setShowConfetti] = useState(false);
  const wasFreeDeliveryUnlockedRef = useRef(false);

  const mrpSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const discountedSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const mrp = Number(item.price) || 0;
      const discountPercent = Number(item.discount) || 0;
      const unit = discountPercent > 0 ? mrp - (mrp * discountPercent) / 100 : mrp;
      const unitRounded = Math.round(unit * 100) / 100;
      return sum + unitRounded * (Number(item.quantity) || 0);
    }, 0);
  }, [cartItems]);

  const hasDiscount = mrpSubtotal - discountedSubtotal > 0.009;
  const deliveryCharge = discountedSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const totalPrice = discountedSubtotal + deliveryCharge;

  const isFreeDeliveryUnlocked = discountedSubtotal >= FREE_DELIVERY_THRESHOLD;

  const freeDeliveryRemaining = Math.max(0, FREE_DELIVERY_THRESHOLD - discountedSubtotal);
  const freeDeliveryProgressPct = FREE_DELIVERY_THRESHOLD > 0
    ? Math.min(100, (discountedSubtotal / FREE_DELIVERY_THRESHOLD) * 100)
    : 0;

  useEffect(() => {
    const wasUnlocked = wasFreeDeliveryUnlockedRef.current;
    if (!wasUnlocked && isFreeDeliveryUnlocked) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 1400);
      return () => clearTimeout(t);
    }
    wasFreeDeliveryUnlockedRef.current = isFreeDeliveryUnlocked;
  }, [isFreeDeliveryUnlocked]);

  const confettiPieces = useMemo(() => {
    if (!showConfetti) return [];
    return Array.from({ length: 28 }, () => {
      return {
        left: Math.random() * 100,
        delayMs: Math.random() * 200,
        driftPx: (Math.random() * 2 - 1) * 60,
        rotateDeg: (Math.random() * 2 - 1) * 520,
      };
    });
  }, [showConfetti]);

  const suggestionGroupsConfig = useMemo(() => {
    return [
      {
        key: 'sweets',
        title: 'Sweets',
        categories: ['Bengali Sweets', 'Dry Sweets', 'Seasonal'],
      },
      {
        key: 'beverages',
        title: 'Beverages',
        categories: ['Beverages'],
      },
      {
        key: 'snacks',
        title: 'Snacks',
        categories: ['Snacks', 'Fastfood'],
      },
    ];
  }, []);

  const [suggestionGroups, setSuggestionGroups] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const shuffleInPlace = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const sortBySuggestedRank = (arr) => {
    return arr.sort((a, b) => {
      const ar = Number.isFinite(Number(a?.suggestedRank)) ? Number(a.suggestedRank) : 9999;
      const br = Number.isFinite(Number(b?.suggestedRank)) ? Number(b.suggestedRank) : 9999;
      if (ar !== br) return ar - br;
      return 0;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const cartIds = new Set(cartItems.map((i) => i._id));

        const groups = await Promise.all(
          suggestionGroupsConfig.map(async (group) => {
            const responses = await Promise.all(
              group.categories.map((cat) => getProducts({ category: cat, suggested: 'true' }))
            );

            const merged = responses
              .flatMap((r) => (Array.isArray(r.data) ? r.data : []))
              .filter((p) => p && p._id && !cartIds.has(p._id));

            const seen = new Set();
            const unique = [];
            for (const p of merged) {
              if (seen.has(p._id)) continue;
              seen.add(p._id);
              unique.push(p);
            }

            const hasAnyRank = unique.some((p) => Number.isFinite(Number(p?.suggestedRank)));
            if (hasAnyRank) {
              sortBySuggestedRank(unique);
            } else {
              shuffleInPlace(unique);
            }

            return {
              key: group.key,
              title: group.title,
              products: unique.slice(0, 3),
            };
          })
        );

        const nonEmpty = groups.filter((g) => g.products.length > 0);
        if (!cancelled) setSuggestionGroups(nonEmpty);
      } catch (e) {
        if (!cancelled) setSuggestionGroups([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [cartItems, suggestionGroupsConfig]);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some delicious sweets to get started!</p>
        <Link
          to="/products"
          className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {showConfetti && (
        <div className="cart-confetti" aria-hidden>
          {confettiPieces.map((p, idx) => {
            const colorClass = idx % 6 === 0
              ? 'bg-orange-500'
              : idx % 6 === 1
                ? 'bg-green-500'
                : idx % 6 === 2
                  ? 'bg-yellow-400'
                  : idx % 6 === 3
                    ? 'bg-red-500'
                    : idx % 6 === 4
                      ? 'bg-blue-500'
                      : 'bg-purple-500';

            return (
              <span
                key={idx}
                className={`cart-confetti__piece ${colorClass}`}
                style={{
                  ['--left']: p.left,
                  ['--delay']: `${p.delayMs}ms`,
                  ['--drift']: `${p.driftPx}px`,
                  ['--rotate']: `${p.rotateDeg}deg`,
                }}
              />
            );
          })}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="mb-6 bg-white rounded-lg shadow-md p-4 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Unlock Savings</p>
            {freeDeliveryRemaining > 0 ? (
              <p className="text-sm text-gray-700 truncate">
                Add <span className="font-semibold text-orange-600">₹{freeDeliveryRemaining.toFixed(0)}</span> more to get <span className="font-semibold text-green-700">FREE DELIVERY</span>
              </p>
            ) : (
              <p className="text-sm text-gray-700 truncate">
                Congrats! You got <span className="font-semibold text-green-700">FREE DELIVERY</span>
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-2xl" aria-hidden>
            {freeDeliveryRemaining > 0 ? '🚚' : '🎉'}
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${freeDeliveryProgressPct}%` }}
              aria-hidden
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>₹0</span>
            <span>₹{FREE_DELIVERY_THRESHOLD} for free delivery</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const discountedPrice = item.discount > 0
              ? item.price - (item.price * item.discount / 100)
              : item.price;

            return (
              <div key={item._id} className="bg-white rounded-lg shadow-md p-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={getProductCardThumbUrl(item.images[0])}
                      alt={item.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-4xl">🍰</span>
                    </div>
                  )}
                </div>

                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.category}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      {item.discount > 0 ? (
                        <div>
                          <span className="text-xl font-bold text-orange-600">₹{(discountedPrice * item.quantity).toFixed(0)}</span>
                          <span className="text-sm text-gray-500 line-through ml-2">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-orange-600">₹{(item.price * item.quantity).toFixed(0)}</span>
                      )}
                      <p className="text-sm text-gray-500">₹{discountedPrice.toFixed(0)} each</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 border rounded-lg">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="px-4">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Clear Cart
            </button>
          </div>

          {suggestionsLoading || suggestionGroups.length > 0 ? (
            <div className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Items you may like</h2>
                <Link to="/products" className="text-sm text-orange-600 hover:text-orange-700">
                  View all
                </Link>
              </div>

              {suggestionsLoading ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-gray-600">
                  Loading suggestions…
                </div>
              ) : (
                <div className="space-y-6">
                  {suggestionGroups.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gray-200" />
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {group.title}
                        </div>
                        <div className="h-px flex-1 bg-gray-200" />
                      </div>

                      <div className="space-y-3">
                        {group.products.map((p) => {
                          const discountedPrice = p.discount > 0
                            ? p.price - (p.price * p.discount) / 100
                            : p.price;

                          return (
                            <Link
                              to={`/products/${p._id}`}
                              key={p._id}
                              className="block bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                  {p.images && p.images.length > 0 ? (
                                    <img
                                      src={getProductCardThumbUrl(p.images[0])}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <span className="text-2xl">🍰</span>
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{p.weight || p.category}</div>

                                  <div className="mt-1 flex items-baseline gap-2">
                                    <div className="text-sm font-bold text-gray-900">₹{Number(discountedPrice).toFixed(0)}</div>
                                    {p.discount > 0 ? (
                                      <div className="text-xs text-gray-500 line-through">₹{Number(p.price).toFixed(0)}</div>
                                    ) : null}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addToCart(p);
                                  }}
                                  className="flex-shrink-0 bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-orange-700 transition"
                                >
                                  Add
                                </button>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span className="text-right">
                  {hasDiscount ? (
                    <>
                      <span className="text-sm text-gray-500 line-through mr-2">₹{mrpSubtotal.toFixed(2)}</span>
                      <span>₹{discountedSubtotal.toFixed(2)}</span>
                    </>
                  ) : (
                    <span>₹{discountedSubtotal.toFixed(2)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>{deliveryCharge === 0 ? <span className="text-green-700">Free</span> : `₹${deliveryCharge.toFixed(2)}`}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">₹{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Proceed to Checkout
            </button>

            <Link
              to="/products"
              className="block text-center text-orange-600 hover:text-orange-700 mt-4"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
