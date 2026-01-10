import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { getSweetCoinHistory } from '../services/orderService';

const formatInr = (value = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function formatWhen(dateLike) {
  try {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

function titleFor(entry) {
  const amt = Math.max(0, Math.floor(Number(entry?.amount) || 0));
  if (entry?.type === 'earned') return `Earned 🪙 ${amt}`;
  if (entry?.type === 'used') return `Used 🪙 ${amt}`;
  if (entry?.type === 'refund') return `Refunded 🪙 ${amt}`;
  if (entry?.type === 'gift') return `Gifted 🪙 ${amt}`;
  if (entry?.type === 'adjust') return `Adjusted 🪙 ${amt}`;
  return `🪙 ${amt}`;
}

function badgeFor(entry) {
  if (entry?.type === 'earned' && entry?.status === 'pending') return 'Pending';
  if (entry?.type === 'earned' && entry?.status === 'credited') return 'Credited';
  if (entry?.type === 'refund') return 'Refunded';
  if (entry?.type === 'used') return 'Used';
  if (entry?.type === 'gift') return 'Gift';
  if (entry?.type === 'adjust') return 'Adjusted';
  return '';
}

export default function SweetCoin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ balance: 0, pendingTotal: 0, entries: [] });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getSweetCoinHistory();
        const payload = res?.data || {};
        if (!cancelled) {
          setData({
            balance: Math.max(0, Math.floor(Number(payload?.balance) || 0)),
            pendingTotal: Math.max(0, Math.floor(Number(payload?.pendingTotal) || 0)),
            entries: Array.isArray(payload?.entries) ? payload.entries : [],
          });
        }
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load SweetCoin history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => {
    const list = Array.isArray(data?.entries) ? data.entries : [];
    return list.map((e, idx) => ({ ...e, _k: e?.id || `${e?.type || 'entry'}:${e?.orderId || idx}` }));
  }, [data?.entries]);

  if (loading) return <Loader />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🪙 SweetCoin</h1>
          <p className="mt-1 text-sm text-gray-600">₹1 = 1 SweetCoin. Earn after delivery, redeem on your next order.</p>
        </div>
        <Link
          to="/products"
          className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-white font-semibold hover:bg-orange-700 transition"
        >
          Order now
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white shadow p-5">
          <div className="text-sm text-gray-600">Available</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">🪙 {data.balance}</div>
          <div className="mt-1 text-xs text-gray-500">Worth {formatInr(data.balance)} off</div>
        </div>
        <div className="rounded-xl bg-white shadow p-5">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">🪙 {data.pendingTotal}</div>
          <div className="mt-1 text-xs text-gray-500">Credits after delivery</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white shadow">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-gray-600">Earned, used, refunded, and pending entries.</p>
        </div>

        <div className="divide-y">
          {entries.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-600">No SweetCoin history yet.</div>
          ) : (
            entries.map((e) => {
              const amt = Math.max(0, Math.floor(Number(e?.amount) || 0));
              const delta = Number(e?.delta) || 0;
              const positive = delta > 0;
              const badge = badgeFor(e);
              const when = formatWhen(e?.at);
              const orderId = e?.orderId ? String(e.orderId) : '';

              return (
                <div key={e._k} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-gray-900">{titleFor(e)}</div>
                      {badge ? (
                        <span
                          className={
                            `text-xs px-2 py-0.5 rounded-full border ` +
                            (badge === 'Pending'
                              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                              : badge === 'Credited'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : badge === 'Refunded'
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-800')
                          }
                        >
                          {badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      {when ? <span>{when}</span> : null}
                      {orderId ? (
                        <>
                          {when ? <span className="mx-2">•</span> : null}
                          <Link to={`/orders/${orderId}`} className="text-orange-600 hover:text-orange-700 font-medium">
                            View order
                          </Link>
                        </>
                      ) : null}
                    </div>

                    {e?.note ? <div className="mt-1 text-xs text-gray-500">{String(e.note)}</div> : null}

                    {e?.type === 'earned' && e?.status === 'pending' ? (
                      <div className="mt-1 text-xs text-gray-500">Will be credited after delivery.</div>
                    ) : null}
                  </div>

                  <div className="text-right shrink-0">
                    <div className={
                      `text-sm font-semibold ` +
                      (positive ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700')
                    }>
                      {positive ? '+' : delta < 0 ? '−' : ''}🪙 {amt}
                    </div>
                    <div className="text-xs text-gray-500">{formatInr(Math.abs(delta))}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
