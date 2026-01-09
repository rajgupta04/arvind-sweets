import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminSidebar from './components/AdminSidebar';
import AdminNavbar from './components/AdminNavbar';
import { getSettings, updateSettings } from './services/adminApi';
import { getAllProducts } from './services/adminApi';
import { toast } from '../components/ui/use-toast';
import { Toaster } from '../components/ui/toaster';

function DeliverySettings() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buffer, setBuffer] = useState(10);
  const [showProductQuantity, setShowProductQuantity] = useState(true);
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [rangeTimezone, setRangeTimezone] = useState('Asia/Kolkata');
  const [rangeRounding, setRangeRounding] = useState('ceil');
  const [rangeRules, setRangeRules] = useState([]);
  const [saving, setSaving] = useState(false);

  const [freeDeliveryGoalEnabled, setFreeDeliveryGoalEnabled] = useState(true);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(250);
  const [freeGiftGoalEnabled, setFreeGiftGoalEnabled] = useState(false);
  const [freeGiftThreshold, setFreeGiftThreshold] = useState(500);
  const [freeGiftMaxItems, setFreeGiftMaxItems] = useState(1);
  const [freeGiftBucketEntries, setFreeGiftBucketEntries] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [giftSearch, setGiftSearch] = useState('');

  const normalizeGiftBucketFromSettings = (bucket) => {
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
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    const fetch = async () => {
      try {
        const [s, products] = await Promise.all([
          getSettings(),
          getAllProducts(),
        ]);
        setBuffer(Number(s.deliveryBuffer || 10));
        setShowProductQuantity(s?.showProductQuantity !== false);
        const dr = s?.deliveryRange || {};
        setRangeEnabled(Boolean(dr.enabled));
        setRangeTimezone(String(dr.timezone || 'Asia/Kolkata'));
        setRangeRounding(String(dr.rounding || 'ceil'));
        setRangeRules(Array.isArray(dr.rules) ? dr.rules : []);

        const cg = s?.cartGoals || {};
        setFreeDeliveryGoalEnabled(cg?.freeDelivery?.enabled !== false);
        setFreeDeliveryThreshold(Number(cg?.freeDelivery?.threshold) || 250);
        setFreeGiftGoalEnabled(Boolean(cg?.freeGift?.enabled));
        setFreeGiftThreshold(Number(cg?.freeGift?.threshold) || 500);
        setFreeGiftMaxItems(Number(cg?.freeGift?.maxItems) || 1);
        setFreeGiftBucketEntries(normalizeGiftBucketFromSettings(cg?.freeGift?.bucket));

        setAllProducts(Array.isArray(products) ? products : []);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, navigate]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const value = Math.max(5, Math.min(30, Number(buffer)));
      await updateSettings({
        deliveryBuffer: value,
        showProductQuantity: Boolean(showProductQuantity),
        cartGoals: {
          freeDelivery: {
            enabled: Boolean(freeDeliveryGoalEnabled),
            threshold: Number(freeDeliveryThreshold),
          },
          freeGift: {
            enabled: Boolean(freeGiftGoalEnabled),
            threshold: Number(freeGiftThreshold),
            maxItems: Number(freeGiftMaxItems),
            bucket: freeGiftBucketEntries.map((e) => ({
              product: String(e.productId),
              ...(e.pricingOptionId ? { pricingOptionId: String(e.pricingOptionId) } : {}),
            })),
          },
        },
        deliveryRange: {
          enabled: Boolean(rangeEnabled),
          timezone: String(rangeTimezone || 'Asia/Kolkata').trim() || 'Asia/Kolkata',
          rounding: rangeRounding,
          rules: rangeRules.map((r) => ({
            startTime: String(r?.startTime || '').trim(),
            endTime: String(r?.endTime || '').trim(),
            includedKm: Number(r?.includedKm),
            maxKm: Number(r?.maxKm),
            freeAboveAmount: Number(r?.freeAboveAmount),
            perKmCharge: Number(r?.perKmCharge),
          })),
        },
      });
      toast({ title: 'Saved', description: 'Delivery settings updated successfully.' });
    } catch (err) {
      console.error('Failed to save settings', err);
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedGiftProducts = freeGiftBucketEntries
    .map((e) => {
      const product = allProducts.find((p) => p?._id && String(p._id) === String(e.productId));
      return product ? { entry: e, product } : null;
    })
    .filter(Boolean);

  const selectedGiftProductIds = new Set(freeGiftBucketEntries.map((e) => String(e.productId)));
  const giftCandidates = allProducts
    .filter((p) => p?._id && !selectedGiftProductIds.has(String(p._id)))
    .filter((p) => {
      const q = String(giftSearch || '').trim().toLowerCase();
      if (!q) return true;
      const name = String(p?.name || '').toLowerCase();
      const cat = String(p?.category || '').toLowerCase();
      return name.includes(q) || cat.includes(q);
    })
    .slice(0, 40);

  const handleAddRule = () => {
    setRangeRules((prev) => [
      ...prev,
      {
        startTime: '09:00',
        endTime: '19:00',
        includedKm: 3,
        maxKm: 6,
        freeAboveAmount: 500,
        perKmCharge: 15,
      },
    ]);
  };

  const updateRule = (idx, patch) => {
    setRangeRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const deleteRule = (idx) => {
    setRangeRules((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 ml-64">
          <AdminNavbar />
          <main className="p-8 mt-16">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="max-w-xl bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Delivery Settings</h1>
            <p className="text-gray-600 mb-6">Adjust the delivery buffer time used for ETA calculations.</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="range"
              min={5}
              max={30}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full mt-4"
            />

            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Website UI</h2>
              <p className="text-sm text-gray-600 mb-4">Control what customers see on the product page.</p>
              <div className="flex items-center gap-3">
                <input
                  id="showProductQuantity"
                  type="checkbox"
                  checked={showProductQuantity}
                  onChange={(e) => setShowProductQuantity(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="showProductQuantity" className="text-sm font-medium text-gray-700">
                  Show product stock quantity (e.g., “12 available”)
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Cart Progress Goals</h2>
              <p className="text-sm text-gray-600 mb-4">Control the cart progress bar goals (free delivery, gift bucket).</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="freeDeliveryGoalEnabled"
                    type="checkbox"
                    checked={freeDeliveryGoalEnabled}
                    onChange={(e) => setFreeDeliveryGoalEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="freeDeliveryGoalEnabled" className="text-sm font-medium text-gray-700">
                    Enable free delivery goal
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Free delivery threshold (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="freeGiftGoalEnabled"
                    type="checkbox"
                    checked={freeGiftGoalEnabled}
                    onChange={(e) => setFreeGiftGoalEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="freeGiftGoalEnabled" className="text-sm font-medium text-gray-700">
                    Enable free add-on (gift) goal
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gift unlock threshold (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={freeGiftThreshold}
                      onChange={(e) => setFreeGiftThreshold(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      disabled={!freeGiftGoalEnabled}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max free items</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={freeGiftMaxItems}
                      onChange={(e) => setFreeGiftMaxItems(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      disabled={!freeGiftGoalEnabled}
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Gift bucket products</div>
                      <div className="text-xs text-gray-600">Customers can pick a free add-on from this list after reaching the goal.</div>
                    </div>
                    <div className="text-xl" aria-hidden>🎁</div>
                  </div>

                  <div className="mt-3">
                    <input
                      value={giftSearch}
                      onChange={(e) => setGiftSearch(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Search products to add..."
                      disabled={!freeGiftGoalEnabled}
                    />
                  </div>

                  {selectedGiftProducts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedGiftProducts.map(({ entry, product }) => {
                        const baseOption = { id: '', label: 'Base / Default' };
                        const productOptions = Array.isArray(product?.pricingOptions)
                          ? product.pricingOptions
                              .filter((o) => o && o._id && o.label)
                              .map((o) => ({ id: String(o._id), label: String(o.label) }))
                          : [];
                        const optionChoices = [baseOption, ...productOptions];

                        return (
                          <div key={String(product._id)} className="flex items-center gap-3 p-2 rounded-lg border">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                              <div className="text-xs text-gray-500 truncate">{product.category}</div>
                            </div>

                            <div className="w-48">
                              <select
                                value={entry.pricingOptionId || ''}
                                onChange={(e) => {
                                  const next = String(e.target.value || '');
                                  setFreeGiftBucketEntries((prev) =>
                                    prev.map((x) =>
                                      String(x.productId) === String(entry.productId)
                                        ? { ...x, pricingOptionId: next }
                                        : x
                                    )
                                  );
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={!freeGiftGoalEnabled}
                              >
                                {optionChoices.map((o) => (
                                  <option key={o.id || 'base'} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setFreeGiftBucketEntries((prev) => prev.filter((x) => String(x.productId) !== String(product._id)))
                              }
                              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                              disabled={!freeGiftGoalEnabled}
                              title="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                    {giftCandidates.map((p) => (
                      <label key={p._id} className={`flex items-center gap-3 p-2 rounded-lg border ${freeGiftGoalEnabled ? 'cursor-pointer' : 'opacity-50'}`}>
                        <input
                          type="checkbox"
                          checked={selectedGiftProductIds.has(String(p._id))}
                          onChange={(e) => {
                            const id = String(p._id);
                            if (e.target.checked) {
                              setFreeGiftBucketEntries((prev) => {
                                if (prev.some((x) => String(x.productId) === id)) return prev;
                                return [...prev, { productId: id, pricingOptionId: '' }];
                              });
                            } else {
                              setFreeGiftBucketEntries((prev) => prev.filter((x) => String(x.productId) !== id));
                            }
                          }}
                          disabled={!freeGiftGoalEnabled}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 truncate">{p.category}</div>
                        </div>
                      </label>
                    ))}
                    {giftCandidates.length === 0 && (
                      <div className="text-sm text-gray-600">No products found.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Delivery Settings'}
              </button>
            </div>
          </div>

          <div className="max-w-4xl bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delivery Range Rules</h2>
            <p className="text-gray-600 mb-6">
              Configure distance limits and extra per-km charges by time window.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <input
                id="rangeEnabled"
                type="checkbox"
                checked={rangeEnabled}
                onChange={(e) => setRangeEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="rangeEnabled" className="text-sm font-medium text-gray-700">
                Enable distance/time based delivery pricing
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <input
                  value={rangeTimezone}
                  onChange={(e) => setRangeTimezone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Asia/Kolkata"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distance rounding</label>
                <select
                  value={rangeRounding}
                  onChange={(e) => setRangeRounding(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="ceil">Ceil extra km (recommended)</option>
                  <option value="exact">Exact extra km</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Rules</h3>
              <button
                type="button"
                onClick={handleAddRule}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black"
              >
                Add rule
              </button>
            </div>

            {rangeRules.length === 0 ? (
              <div className="text-sm text-gray-600">No rules yet. Click “Add rule”.</div>
            ) : (
              <div className="space-y-4">
                {rangeRules.map((r, idx) => (
                  <div key={r?._id || idx} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                        <input
                          value={r.startTime || ''}
                          onChange={(e) => updateRule(idx, { startTime: e.target.value })}
                          placeholder="09:00"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                        <input
                          value={r.endTime || ''}
                          onChange={(e) => updateRule(idx, { endTime: e.target.value })}
                          placeholder="19:00"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Included km</label>
                        <input
                          type="number"
                          value={r.includedKm ?? ''}
                          onChange={(e) => updateRule(idx, { includedKm: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Max km</label>
                        <input
                          type="number"
                          value={r.maxKm ?? ''}
                          onChange={(e) => updateRule(idx, { maxKm: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Free above ₹</label>
                        <input
                          type="number"
                          value={r.freeAboveAmount ?? ''}
                          onChange={(e) => updateRule(idx, { freeAboveAmount: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">₹ per extra km</label>
                        <input
                          type="number"
                          value={r.perKmCharge ?? ''}
                          onChange={(e) => updateRule(idx, { perKmCharge: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => deleteRule(idx)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Changes here apply only after saving.
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Delivery Settings'}
              </button>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </div>
  );
}

export default DeliverySettings;
