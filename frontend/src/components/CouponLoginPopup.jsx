import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getPopupCoupon } from '../services/couponService';
import { toast } from './ui/use-toast';

function storageKey({ userId, couponId }) {
  return `coupon_popup_shown:${String(userId)}:${String(couponId)}`;
}

export default function CouponLoginPopup() {
  const { user, authEvent } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const loadingRef = useRef(false);

  const eligible = Boolean(user && authEvent?.nonce && authEvent?.type);

  const seenKey = useMemo(() => {
    if (!user || !coupon?._id) return null;
    return storageKey({ userId: user._id || user.id, couponId: coupon._id });
  }, [coupon?._id, user]);

  useEffect(() => {
    const run = async () => {
      if (!eligible) return;
      if (loadingRef.current) return;

      loadingRef.current = true;
      try {
        const data = await getPopupCoupon();
        const next = data?.coupon || null;
        if (!next?._id) return;

        const key = storageKey({ userId: user._id || user.id, couponId: next._id });
        try {
          const already = localStorage.getItem(key);
          if (already) return;
        } catch {}

        setCoupon(next);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        loadingRef.current = false;
      }
    };

    run();
    // Only when a real login/register/oauth event occurs
  }, [eligible, authEvent?.nonce]);

  const close = () => {
    setOpen(false);
    if (seenKey) {
      try {
        localStorage.setItem(seenKey, String(Date.now()));
      } catch {}
    }
  };

  const onCopy = async () => {
    const code = String(coupon?.code || '').trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copied', description: 'Coupon code copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually', variant: 'destructive' });
    }
  };

  if (!open || !coupon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-72 md:h-auto bg-center">
            {coupon.imageUrl ? (
              <img src={coupon.imageUrl} alt="Coupon" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full bg-gray-100" />
            )}
          </div>

          <div className="relative p-6 md:p-8">
            <button
              onClick={close}
              className="absolute right-3 top-3 p-2 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="text-sm text-gray-600">Don’t go away, here’s a surprise!</div>
            <div className="mt-4 text-2xl font-bold text-gray-900">
              {coupon.title || 'Special Coupon'}
            </div>
            {coupon.description ? (
              <div className="mt-2 text-gray-600">{coupon.description}</div>
            ) : null}

            <div className="mt-6">
              <input
                value={coupon.code}
                readOnly
                className="w-full text-center tracking-widest px-4 py-3 border rounded-lg bg-gray-50 font-semibold"
              />
              <button
                onClick={onCopy}
                className="mt-3 w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 transition"
              >
                Copy code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
