import Coupon from '../models/Coupon.js';

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase();
}

export function isCouponCurrentlyActive(coupon, now = new Date()) {
  if (!coupon) return false;
  if (!coupon.isActive) return false;

  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) return false;
  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) return false;

  return true;
}

export function computeDiscountAmount({ coupon, itemsPrice }) {
  const base = typeof itemsPrice === 'number' && !Number.isNaN(itemsPrice) ? itemsPrice : 0;
  if (!coupon || base <= 0) return 0;

  let amount = 0;
  if (coupon.discountType === 'percent') {
    amount = (base * (Number(coupon.discountValue) || 0)) / 100;
    if (typeof coupon.maxDiscount === 'number' && !Number.isNaN(coupon.maxDiscount)) {
      amount = Math.min(amount, coupon.maxDiscount);
    }
  } else {
    amount = Number(coupon.discountValue) || 0;
  }

  amount = Math.max(0, amount);
  amount = Math.min(amount, base);

  // Keep to 2 decimals
  return Math.round(amount * 100) / 100;
}

export function getUserUsageCount(coupon, userId) {
  if (!coupon || !userId) return 0;
  const entry = (coupon.userUsages || []).find((u) => String(u.user) === String(userId));
  return entry?.count || 0;
}

export function validateCouponOrThrow({ coupon, itemsPrice, userId }) {
  const now = new Date();
  if (!isCouponCurrentlyActive(coupon, now)) {
    const err = new Error('Coupon is not active');
    err.statusCode = 400;
    throw err;
  }

  const base = typeof itemsPrice === 'number' && !Number.isNaN(itemsPrice) ? itemsPrice : 0;
  const minOrder = typeof coupon.minOrderValue === 'number' && !Number.isNaN(coupon.minOrderValue) ? coupon.minOrderValue : 0;
  if (base < minOrder) {
    const err = new Error(`Minimum order value for this coupon is ₹${minOrder}`);
    err.statusCode = 400;
    throw err;
  }

  if (typeof coupon.usageLimit === 'number' && !Number.isNaN(coupon.usageLimit)) {
    if ((coupon.usageCount || 0) >= coupon.usageLimit) {
      const err = new Error('Coupon usage limit reached');
      err.statusCode = 400;
      throw err;
    }
  }

  const perUserLimit = typeof coupon.perUserLimit === 'number' && !Number.isNaN(coupon.perUserLimit) ? coupon.perUserLimit : 1;
  if (userId && perUserLimit != null) {
    const used = getUserUsageCount(coupon, userId);
    if (used >= perUserLimit) {
      const err = new Error('You have already used this coupon');
      err.statusCode = 400;
      throw err;
    }
  }

  const discountAmount = computeDiscountAmount({ coupon, itemsPrice: base });
  if (discountAmount <= 0) {
    const err = new Error('Coupon does not apply to this order');
    err.statusCode = 400;
    throw err;
  }

  return { discountAmount };
}

export async function recordCouponUsage({ couponId, userId }) {
  if (!couponId || !userId) return;
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;

  const perUserLimit = typeof coupon.perUserLimit === 'number' && !Number.isNaN(coupon.perUserLimit) ? coupon.perUserLimit : 1;
  const totalLimit = typeof coupon.usageLimit === 'number' && !Number.isNaN(coupon.usageLimit) ? coupon.usageLimit : null;

  if (totalLimit != null && (coupon.usageCount || 0) >= totalLimit) return;

  const entry = (coupon.userUsages || []).find((u) => String(u.user) === String(userId));
  if (entry) {
    if (perUserLimit != null && (entry.count || 0) >= perUserLimit) return;
    entry.count = (entry.count || 0) + 1;
  } else {
    coupon.userUsages = [...(coupon.userUsages || []), { user: userId, count: 1 }];
  }

  coupon.usageCount = (coupon.usageCount || 0) + 1;
  await coupon.save();
}
