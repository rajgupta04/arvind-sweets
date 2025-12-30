import Coupon from '../models/Coupon.js';
import {
  normalizeCouponCode,
  validateCouponOrThrow,
  recordCouponUsage,
} from '../utils/couponUtils.js';

const pickCouponResponse = (coupon) => {
  if (!coupon) return null;
  return {
    _id: coupon._id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    imageUrl: coupon.imageUrl,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    isActive: coupon.isActive,
    showOnLoginPopup: coupon.showOnLoginPopup,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    usageCount: coupon.usageCount,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
};

// Admin: list all coupons
export const listCoupons = async (req, res) => {
  const coupons = await Coupon.find({}).sort({ updatedAt: -1 });
  res.json(coupons.map(pickCouponResponse));
};

// Admin: create coupon
export const createCoupon = async (req, res) => {
  const {
    code,
    title,
    description,
    imageUrl,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscount,
    startsAt,
    endsAt,
    isActive,
    showOnLoginPopup,
    usageLimit,
    perUserLimit,
  } = req.body || {};

  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const exists = await Coupon.findOne({ code: normalized });
  if (exists) {
    return res.status(400).json({ message: 'Coupon code already exists' });
  }

  const coupon = await Coupon.create({
    code: normalized,
    title: title || '',
    description: description || '',
    imageUrl: imageUrl || '',
    discountType: discountType || 'flat',
    discountValue: Number(discountValue) || 0,
    minOrderValue: Number(minOrderValue) || 0,
    maxDiscount: maxDiscount === '' || maxDiscount == null ? null : Number(maxDiscount),
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    isActive: typeof isActive === 'boolean' ? isActive : true,
    showOnLoginPopup: Boolean(showOnLoginPopup),
    usageLimit: usageLimit === '' || usageLimit == null ? null : Number(usageLimit),
    perUserLimit: perUserLimit === '' || perUserLimit == null ? 1 : Number(perUserLimit),
    createdBy: req.user?._id || null,
  });

  res.status(201).json(pickCouponResponse(coupon));
};

// Admin: update coupon
export const updateCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  const body = req.body || {};

  if (body.code != null) {
    const nextCode = normalizeCouponCode(body.code);
    if (!nextCode) {
      return res.status(400).json({ message: 'Coupon code cannot be empty' });
    }
    if (nextCode !== coupon.code) {
      const exists = await Coupon.findOne({ code: nextCode });
      if (exists) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      coupon.code = nextCode;
    }
  }

  if (body.title != null) coupon.title = body.title;
  if (body.description != null) coupon.description = body.description;
  if (body.imageUrl != null) coupon.imageUrl = body.imageUrl;
  if (body.discountType !=null) coupon.discountType = body.discountType;
  if (body.discountValue != null) coupon.discountValue = Number(body.discountValue) || 0;
  if (body.minOrderValue != null) coupon.minOrderValue = Number(body.minOrderValue) || 0;
  if (body.maxDiscount != null) coupon.maxDiscount = body.maxDiscount === '' ? null : Number(body.maxDiscount);
  if (body.startsAt !== undefined) coupon.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) coupon.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.isActive != null) coupon.isActive = Boolean(body.isActive);
  if (body.showOnLoginPopup != null) coupon.showOnLoginPopup = Boolean(body.showOnLoginPopup);
  if (body.usageLimit !== undefined) coupon.usageLimit = body.usageLimit === '' || body.usageLimit == null ? null : Number(body.usageLimit);
  if (body.perUserLimit !== undefined) coupon.perUserLimit = body.perUserLimit === '' || body.perUserLimit == null ? 1 : Number(body.perUserLimit);

  const saved = await coupon.save();
  res.json(pickCouponResponse(saved));
};

// Admin: delete coupon
export const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }
  await coupon.deleteOne();
  res.json({ message: 'Coupon deleted' });
};

// User: validate coupon
export const validateCoupon = async (req, res) => {
  const { code, itemsPrice } = req.body || {};
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) {
    return res.status(404).json({ message: 'Invalid coupon code' });
  }

  try {
    const base = Number(itemsPrice);
    if (Number.isNaN(base) || base < 0) {
      return res.status(400).json({ message: 'Invalid itemsPrice' });
    }
    const { discountAmount } = validateCouponOrThrow({ coupon, itemsPrice: base, userId: req.user?._id });
    res.json({
      valid: true,
      coupon: pickCouponResponse(coupon),
      discountAmount,
    });
  } catch (e) {
    res.status(e.statusCode || 400).json({ message: e.message || 'Coupon is not valid' });
  }
};

// User: fetch login popup coupon (if any)
export const getPopupCoupon = async (req, res) => {
  const now = new Date();
  const coupon = await Coupon.findOne({
    isActive: true,
    showOnLoginPopup: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  }).sort({ updatedAt: -1 });

  res.json({ coupon: pickCouponResponse(coupon) });
};

// Used by order creation: validate + record usage
export const validateAndRecordUsage = async ({ code, itemsPrice, userId }) => {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) {
    const err = new Error('Invalid coupon code');
    err.statusCode = 400;
    throw err;
  }

  const { discountAmount } = validateCouponOrThrow({ coupon, itemsPrice, userId });
  await recordCouponUsage({ couponId: coupon._id, userId });

  return { coupon, discountAmount };
};
