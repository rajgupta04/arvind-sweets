// Cart page component
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { PublicSettingsContext } from '../context/PublicSettingsContext';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { getProductCardThumbUrl } from '../lib/cloudinary.js';
import { getProductById } from '../services/productService';

const DELIVERY_CHARGE = 50;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 250;
const DEFAULT_FREE_GIFT_THRESHOLD = 500;

function Cart() {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, addToCart, addGiftToCart } = useContext(CartContext);
  const { publicSettings } = useContext(PublicSettingsContext);
  const navigate = useNavigate();

  const [showConfetti, setShowConfetti] = useState(false);
  const wasFreeDeliveryUnlockedRef = useRef(false);

  const [unlockToast, setUnlockToast] = useState(null); // { type: 'delivery'|'gift' }
  const wasGiftUnlockedRef = useRef(false);

  const freeDeliveryGoalEnabled = publicSettings?.cartGoals?.freeDelivery?.enabled !== false;
  const freeDeliveryThreshold = Number(publicSettings?.cartGoals?.freeDelivery?.threshold) || DEFAULT_FREE_DELIVERY_THRESHOLD;

  const freeGiftEnabled = Boolean(publicSettings?.cartGoals?.freeGift?.enabled);
  const freeGiftThreshold = Number(publicSettings?.cartGoals?.freeGift?.threshold) || DEFAULT_FREE_GIFT_THRESHOLD;
  const freeGiftBucketEntries = useMemo(() => {
    const bucket = publicSettings?.cartGoals?.freeGift?.bucket;
    if (!Array.isArray(bucket)) return [];
    const entries = bucket
      .map((x) => {
        if (!x) return null;
        if (typeof x === 'string' || typeof x === 'number') {
          return { productId: String(x), pricingOptionId: '' };
        }
        if (typeof x === 'object') {
          const productId = x.product ? String(x.product) : '';
          if (!productId) return null;
          return {
            productId,
            pricingOptionId: x.pricingOptionId ? String(x.pricingOptionId) : '',
          };
        }
        return null;
      })
      .filter(Boolean);

    const seen = new Set();
    const deduped = [];
    for (const e of entries) {
      if (seen.has(e.productId)) continue;
      seen.add(e.productId);
      deduped.push(e);
    }
    return deduped;
  }, [publicSettings?.cartGoals?.freeGift?.bucket]);

  const freeGiftBucketIds = useMemo(() => freeGiftBucketEntries.map((e) => String(e.productId)), [freeGiftBucketEntries]);
  const freeGiftMaxItems = Math.max(1, Math.min(5, Number(publicSettings?.cartGoals?.freeGift?.maxItems) || 1));

  const paidCartItems = useMemo(() => cartItems.filter((i) => !i?.isGift), [cartItems]);
  const giftCartItems = useMemo(() => cartItems.filter((i) => i?.isGift), [cartItems]);

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

  const eligibleSubtotal = useMemo(() => {
    return paidCartItems.reduce((sum, item) => {
      const mrp = Number(item.price) || 0;
      const discountPercent = Number(item.discount) || 0;
      const unit = discountPercent > 0 ? mrp - (mrp * discountPercent) / 100 : mrp;
      const unitRounded = Math.round(unit * 100) / 100;
      return sum + unitRounded * (Number(item.quantity) || 0);
    }, 0);
  }, [paidCartItems]);

  const hasDiscount = mrpSubtotal - discountedSubtotal > 0.009;
  const isFreeDeliveryUnlocked = freeDeliveryGoalEnabled && eligibleSubtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDeliveryUnlocked ? 0 : DELIVERY_CHARGE;
  const totalPrice = discountedSubtotal + deliveryCharge;

  const isGiftUnlocked = freeGiftEnabled && eligibleSubtotal >= freeGiftThreshold;

  // If cart drops below gift threshold, remove previously added gift lines.
  useEffect(() => {
    if (giftCartItems.length === 0) return;
    if (isGiftUnlocked) return;
    giftCartItems.forEach((g) => {
      if (g?._id) removeFromCart(g._id);
    });
  }, [giftCartItems, isGiftUnlocked, removeFromCart]);

  const freeDeliveryRemaining = Math.max(0, freeDeliveryThreshold - eligibleSubtotal);
  const freeGiftRemaining = Math.max(0, freeGiftThreshold - eligibleSubtotal);

  const maxGoal = useMemo(() => {
    const goals = [];
    if (freeDeliveryGoalEnabled) goals.push(freeDeliveryThreshold);
    if (freeGiftEnabled) goals.push(freeGiftThreshold);
    return Math.max(...goals, 0);
  }, [freeDeliveryGoalEnabled, freeDeliveryThreshold, freeGiftEnabled, freeGiftThreshold]);

  const progressPct = maxGoal > 0 ? Math.min(100, (eligibleSubtotal / maxGoal) * 100) : 0;
  const marker1Pct = (freeDeliveryGoalEnabled && maxGoal > 0)
    ? Math.min(100, (freeDeliveryThreshold / maxGoal) * 100)
    : null;
  const marker2Pct = (freeGiftEnabled && maxGoal > 0)
    ? Math.min(100, (freeGiftThreshold / maxGoal) * 100)
    : null;

  useEffect(() => {
    const wasUnlocked = wasFreeDeliveryUnlockedRef.current;
    if (!wasUnlocked && isFreeDeliveryUnlocked) {
      setShowConfetti(true);
      setUnlockToast({ type: 'delivery' });
      const t = setTimeout(() => setShowConfetti(false), 1400);
      const t2 = setTimeout(() => setUnlockToast(null), 1100);
      return () => clearTimeout(t);
    }
    wasFreeDeliveryUnlockedRef.current = isFreeDeliveryUnlocked;
  }, [isFreeDeliveryUnlocked]);

  useEffect(() => {
    const wasUnlocked = wasGiftUnlockedRef.current;
    if (!wasUnlocked && isGiftUnlocked) {
      setShowConfetti(true);
      setUnlockToast({ type: 'gift' });
      const t = setTimeout(() => setShowConfetti(false), 1600);
      const t2 = setTimeout(() => setUnlockToast(null), 1100);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
    wasGiftUnlockedRef.current = isGiftUnlocked;
  }, [isGiftUnlocked]);

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

  const [giftBucketProducts, setGiftBucketProducts] = useState([]);
  const [giftBucketLoading, setGiftBucketLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadGiftBucket = async () => {
      if (!freeGiftEnabled || freeGiftBucketEntries.length === 0) {
        setGiftBucketProducts([]);
        return;
      }
      setGiftBucketLoading(true);
      try {
        const raw = await Promise.all(
          freeGiftBucketEntries.map(async (entry) => {
            try {
              const res = await getProductById(entry.productId);
              return { product: res.data, entry };
            } catch {
              return null;
            }
          })
        );
        const cleaned = raw
          .filter((x) => x && x.product && x.product._id)
          .map(({ product, entry }) => {
            const pricingOptionId = entry?.pricingOptionId ? String(entry.pricingOptionId) : '';
            const optionLabel = pricingOptionId
              ? (Array.isArray(product?.pricingOptions)
                  ? String(product.pricingOptions.find((o) => o && String(o._id) === pricingOptionId)?.label || '')
                  : '')
              : '';
            return {
              ...product,
              __giftPricingOptionId: pricingOptionId,
              __giftPricingOptionLabel: optionLabel,
            };
          });
        if (!cancelled) setGiftBucketProducts(cleaned);
      } finally {
        if (!cancelled) setGiftBucketLoading(false);
      }
    };
    loadGiftBucket();
    return () => {
      cancelled = true;
    };
  }, [freeGiftEnabled, freeGiftBucketEntries]);

  const giftsInCartCount = giftCartItems.length;
  const canChooseGift = isGiftUnlocked && giftsInCartCount < freeGiftMaxItems;

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

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const paidIds = Array.from(new Set(paidCartItems.map((i) => i?.productId || i?._id).filter(Boolean).map(String)));
        const cartProductIdSet = new Set([
          ...paidIds.map((x) => String(x)),
          ...giftCartItems.map((i) => String(i?.product || '')).filter(Boolean),
        ]);

        // Fetch latest product docs for cart items to read their suggestedWith links
        const cartProducts = await Promise.all(
          paidIds.map(async (id) => {
            try {
              const res = await getProductById(id);
              return res.data;
            } catch {
              return null;
            }
          })
        );

        const suggestedIds = new Set();
        for (const p of cartProducts) {
          if (!p || p.isSuggested !== true) continue;
          const links = Array.isArray(p.suggestedWith) ? p.suggestedWith : [];
          for (const id of links) {
            if (!id) continue;
            const sid = String(id);
            if (!cartProductIdSet.has(sid)) suggestedIds.add(sid);
          }
        }

        const suggestedIdList = Array.from(suggestedIds);
        if (suggestedIdList.length === 0) {
          if (!cancelled) setSuggestionGroups([]);
          return;
        }

        const suggestedProductsRaw = await Promise.all(
          suggestedIdList.map(async (id) => {
            try {
              const res = await getProductById(id);
              return res.data;
            } catch {
              return null;
            }
          })
        );

        const suggestedProducts = suggestedProductsRaw
          .filter((p) => p && p._id && !cartProductIdSet.has(String(p._id)));

        // Group into the existing 3 sections by category
        const groupKeyForCategory = (cat) => {
          if (cat === 'Beverages') return 'beverages';
          if (cat === 'Snacks' || cat === 'Fastfood') return 'snacks';
          return 'sweets';
        };

        const byGroup = {
          sweets: [],
          beverages: [],
          snacks: [],
        };

        for (const p of suggestedProducts) {
          const key = groupKeyForCategory(p.category);
          byGroup[key].push(p);
        }

        for (const key of Object.keys(byGroup)) {
          shuffleInPlace(byGroup[key]);
        }

        const groups = suggestionGroupsConfig.map((g) => ({
          key: g.key,
          title: g.title,
          products: (byGroup[g.key] || []).slice(0, 3),
        }));

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

      {unlockToast?.type && (
        <div className="cart-unlock-toast" role="status" aria-live="polite">
          <div className="bg-white border rounded-xl shadow-lg px-6 py-4">
            {unlockToast.type === 'delivery' ? (
              <div className="flex items-center gap-3">
                <div className="text-2xl" aria-hidden>🚚</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Unlocked</div>
                  <div className="text-sm text-gray-700">Free delivery achieved!</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-2xl" aria-hidden>🎁</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Unlocked</div>
                  <div className="text-sm text-gray-700">Free add-on dish unlocked!</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="mb-6 bg-white rounded-lg shadow-md p-4 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Unlock Savings</p>
            {!freeDeliveryGoalEnabled && !freeGiftEnabled ? (
              <p className="text-sm text-gray-700 truncate">No active goals</p>
            ) : freeDeliveryGoalEnabled && !isFreeDeliveryUnlocked ? (
              <p className="text-sm text-gray-700 truncate">
                Add <span className="font-semibold text-orange-600">₹{freeDeliveryRemaining.toFixed(0)}</span> more to get <span className="font-semibold text-green-700">FREE DELIVERY</span>
              </p>
            ) : freeGiftEnabled && !isGiftUnlocked ? (
              <p className="text-sm text-gray-700 truncate">
                Free delivery unlocked. Add <span className="font-semibold text-orange-600">₹{freeGiftRemaining.toFixed(0)}</span> more to unlock a <span className="font-semibold text-gray-900">FREE ADD-ON</span>
              </p>
            ) : (
              <p className="text-sm text-gray-700 truncate">
                Congrats! You unlocked <span className="font-semibold text-green-700">FREE DELIVERY</span>{freeGiftEnabled ? <> + <span className="font-semibold text-gray-900">FREE ADD-ON</span></> : null}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-2xl" aria-hidden>
            {isGiftUnlocked ? '🎁' : (freeDeliveryGoalEnabled && isFreeDeliveryUnlocked ? '🎉' : '🚚')}
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${progressPct}%` }}
              aria-hidden
            />
          </div>
          {(marker1Pct != null || marker2Pct != null) && (
            <div className="relative -mt-2 h-4" aria-hidden>
              {marker1Pct != null && (
                <span
                  className="absolute top-0 h-4 w-px bg-gray-400"
                  style={{ left: `${marker1Pct}%` }}
                />
              )}
              {marker2Pct != null && (
                <span
                  className="absolute top-0 h-4 w-px bg-gray-400"
                  style={{ left: `${marker2Pct}%` }}
                />
              )}
            </div>
          )}
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>₹0</span>
            <span>
              {freeGiftEnabled ? `₹${freeGiftThreshold} for free add-on` : (freeDeliveryGoalEnabled ? `₹${freeDeliveryThreshold} for free delivery` : '')}
            </span>
          </div>
        </div>
      </div>

      {freeGiftEnabled && isGiftUnlocked && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Free add-on unlocked</p>
              <p className="text-sm text-gray-700">
                {giftsInCartCount >= freeGiftMaxItems
                  ? 'Free add-on already added in cart.'
                  : 'Choose your free add-on dish from the bucket.'}
              </p>
            </div>
            <div className="text-2xl" aria-hidden>🎁</div>
          </div>

          {canChooseGift && (
            <div className="mt-4">
              {giftBucketLoading ? (
                <div className="text-sm text-gray-600">Loading gift options...</div>
              ) : giftBucketProducts.length === 0 ? (
                <div className="text-sm text-gray-600">No gift options configured yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {giftBucketProducts
                    .filter((p) => {
                      const inCartPaid = paidCartItems.some((i) => String(i?.productId || i?._id) === String(p._id));
                      const inCartGift = giftCartItems.some((i) => String(i.product) === String(p._id));
                      return !inCartPaid && !inCartGift;
                    })
                    .map((p) => (
                      <div key={p._id} className="border rounded-lg p-3 flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {Array.isArray(p.images) && p.images[0] ? (
                            <img src={getProductCardThumbUrl(p.images[0])} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🍽️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 truncate">{p.category}</div>
                          {p.__giftPricingOptionLabel ? (
                            <div className="text-xs text-gray-700 truncate">Option: <span className="font-semibold">{p.__giftPricingOptionLabel}</span></div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => addGiftToCart(p, {
                            pricingOptionId: p.__giftPricingOptionId || '',
                            pricingOptionLabel: p.__giftPricingOptionLabel || '',
                          })}
                          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-black"
                        >
                          Add Free
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                  {!item?.isGift && item?.pricingOptionLabel ? (
                    <p className="text-xs text-gray-700 mb-2">
                      Option: <span className="font-semibold">{item.pricingOptionLabel}</span>
                    </p>
                  ) : null}
                  {item?.isGift && (
                    <p className="text-xs font-semibold text-green-700 mb-2">FREE ADD-ON</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      {item?.isGift ? (
                        <div>
                          <span className="text-xl font-bold text-green-700">Free</span>
                        </div>
                      ) : item.discount > 0 ? (
                        <div>
                          <span className="text-xl font-bold text-orange-600">₹{(discountedPrice * item.quantity).toFixed(0)}</span>
                          <span className="text-sm text-gray-500 line-through ml-2">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-orange-600">₹{(item.price * item.quantity).toFixed(0)}</span>
                      )}
                      {!item?.isGift && (
                        <p className="text-sm text-gray-500">₹{discountedPrice.toFixed(0)} each</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      {!item?.isGift && (
                        <div className="flex items-center space-x-2 border rounded-lg">
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 rounded-l-lg"
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 rounded-r-lg"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
