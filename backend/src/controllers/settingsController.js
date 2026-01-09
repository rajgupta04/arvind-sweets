import Settings from '../models/Settings.js';
import mongoose from 'mongoose';

function isTimeString(v) {
  const s = String(v || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function normalizeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeBoolean(v) {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return undefined;
}

function normalizeObjectIdArray(arr) {
  const ids = Array.isArray(arr) ? arr : [];
  const unique = [];
  const seen = new Set();
  for (const raw of ids) {
    const s = String(raw || '').trim();
    if (!s) continue;
    if (!mongoose.Types.ObjectId.isValid(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    unique.push(s);
  }
  return unique;
}

function normalizeGiftBucket(bucket) {
  // Accept either:
  // - legacy: [productId, ...]
  // - new: [{ product: productId, pricingOptionId?: optionId }, ...]
  const out = [];
  const seen = new Set();

  if (!bucket) return out;

  if (Array.isArray(bucket) && bucket.length > 0 && (typeof bucket[0] === 'string' || mongoose.Types.ObjectId.isValid(String(bucket[0] || '')))) {
    const ids = normalizeObjectIdArray(bucket);
    for (const pid of ids) {
      const key = `${pid}:`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ product: pid });
    }
    return out;
  }

  const items = Array.isArray(bucket) ? bucket : [];
  for (const item of items) {
    const product = String(item?.product || '').trim();
    if (!product || !mongoose.Types.ObjectId.isValid(product)) continue;
    const pricingOptionId = item?.pricingOptionId ? String(item.pricingOptionId).trim() : '';
    const validOptionId = pricingOptionId && mongoose.Types.ObjectId.isValid(pricingOptionId) ? pricingOptionId : undefined;
    const key = `${product}:${validOptionId || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ product, ...(validOptionId ? { pricingOptionId: validOptionId } : {}) });
  }

  return out;
}

function validateCartGoals(cartGoals) {
  if (!cartGoals || typeof cartGoals !== 'object') return { ok: true, value: undefined };

  const freeDeliveryIn = cartGoals?.freeDelivery;
  const freeGiftIn = cartGoals?.freeGift;

  const freeDeliveryEnabled = normalizeBoolean(freeDeliveryIn?.enabled);
  const freeDeliveryThreshold = freeDeliveryIn?.threshold !== undefined ? normalizeNumber(freeDeliveryIn?.threshold) : undefined;

  const freeGiftEnabled = normalizeBoolean(freeGiftIn?.enabled);
  const freeGiftThreshold = freeGiftIn?.threshold !== undefined ? normalizeNumber(freeGiftIn?.threshold) : undefined;
  const freeGiftBucket = freeGiftIn?.bucket !== undefined ? normalizeGiftBucket(freeGiftIn?.bucket) : undefined;
  const freeGiftMaxItems = freeGiftIn?.maxItems !== undefined ? normalizeNumber(freeGiftIn?.maxItems) : undefined;

  if (freeDeliveryThreshold !== undefined) {
    if (!Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold < 0 || freeDeliveryThreshold > 100000) {
      return { ok: false, message: 'cartGoals.freeDelivery.threshold must be between 0 and 100000' };
    }
  }

  if (freeGiftThreshold !== undefined) {
    if (!Number.isFinite(freeGiftThreshold) || freeGiftThreshold < 0 || freeGiftThreshold > 100000) {
      return { ok: false, message: 'cartGoals.freeGift.threshold must be between 0 and 100000' };
    }
  }

  if (freeGiftMaxItems !== undefined) {
    if (!Number.isFinite(freeGiftMaxItems) || freeGiftMaxItems < 1 || freeGiftMaxItems > 5) {
      return { ok: false, message: 'cartGoals.freeGift.maxItems must be between 1 and 5' };
    }
  }

  const value = {
    ...(freeDeliveryIn ? {
      freeDelivery: {
        ...(freeDeliveryEnabled !== undefined ? { enabled: freeDeliveryEnabled } : {}),
        ...(freeDeliveryThreshold !== undefined ? { threshold: freeDeliveryThreshold } : {}),
      },
    } : {}),
    ...(freeGiftIn ? {
      freeGift: {
        ...(freeGiftEnabled !== undefined ? { enabled: freeGiftEnabled } : {}),
        ...(freeGiftThreshold !== undefined ? { threshold: freeGiftThreshold } : {}),
        ...(freeGiftBucket !== undefined ? { bucket: freeGiftBucket } : {}),
        ...(freeGiftMaxItems !== undefined ? { maxItems: freeGiftMaxItems } : {}),
      },
    } : {}),
  };

  return { ok: true, value };
}

function validateDeliveryRange(range) {
  if (!range || typeof range !== 'object') return { ok: true, value: undefined };

  const enabled = Boolean(range.enabled);
  const timezone = String(range.timezone || 'Asia/Kolkata').trim() || 'Asia/Kolkata';
  const rounding = String(range.rounding || 'ceil').trim();
  if (!['ceil', 'exact'].includes(rounding)) {
    return { ok: false, message: 'deliveryRange.rounding must be one of: ceil, exact' };
  }

  const rulesIn = Array.isArray(range.rules) ? range.rules : undefined;
  if (rulesIn && rulesIn.length === 0) {
    return { ok: false, message: 'deliveryRange.rules cannot be empty' };
  }

  const rules = rulesIn
    ? rulesIn.map((r) => {
        const startTime = String(r?.startTime || '').trim();
        const endTime = String(r?.endTime || '').trim();
        const includedKm = normalizeNumber(r?.includedKm);
        const maxKm = normalizeNumber(r?.maxKm);
        const freeAboveAmount = normalizeNumber(r?.freeAboveAmount);
        const perKmCharge = normalizeNumber(r?.perKmCharge);

        return { startTime, endTime, includedKm, maxKm, freeAboveAmount, perKmCharge };
      })
    : undefined;

  if (rules) {
    for (const r of rules) {
      if (!isTimeString(r.startTime) || !isTimeString(r.endTime)) {
        return { ok: false, message: 'deliveryRange.rules startTime/endTime must be HH:MM (24h)' };
      }
      if (!Number.isFinite(r.includedKm) || r.includedKm < 0 || r.includedKm > 50) {
        return { ok: false, message: 'deliveryRange.rules includedKm must be between 0 and 50' };
      }
      if (!Number.isFinite(r.maxKm) || r.maxKm <= 0 || r.maxKm > 100) {
        return { ok: false, message: 'deliveryRange.rules maxKm must be between 0 and 100' };
      }
      if (r.maxKm < r.includedKm) {
        return { ok: false, message: 'deliveryRange.rules maxKm must be >= includedKm' };
      }
      if (!Number.isFinite(r.freeAboveAmount) || r.freeAboveAmount < 0) {
        return { ok: false, message: 'deliveryRange.rules freeAboveAmount must be >= 0' };
      }
      if (!Number.isFinite(r.perKmCharge) || r.perKmCharge < 0 || r.perKmCharge > 10000) {
        return { ok: false, message: 'deliveryRange.rules perKmCharge must be between 0 and 10000' };
      }
    }
  }

  return {
    ok: true,
    value: {
      enabled,
      timezone,
      rounding,
      ...(rules ? { rules } : {}),
    },
  };
}

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ deliveryBuffer: 10 });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public settings for client-side calculations (no secrets)
export const getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ deliveryBuffer: 10 });
    }

    const shopLat = Number(process.env.SHOP_LAT);
    const shopLng = Number(process.env.SHOP_LNG);

    res.json({
      deliveryBuffer: settings.deliveryBuffer,
      deliveryRange: settings.deliveryRange || { enabled: false, timezone: 'Asia/Kolkata', rounding: 'ceil', rules: [] },
      ui: {
        // Default to true if missing on older documents
        showProductQuantity: settings.showProductQuantity !== false,
      },
      cartGoals: {
        freeDelivery: {
          enabled: settings?.cartGoals?.freeDelivery?.enabled !== false,
          threshold: Number(settings?.cartGoals?.freeDelivery?.threshold) || 250,
        },
        freeGift: {
          enabled: Boolean(settings?.cartGoals?.freeGift?.enabled),
          threshold: Number(settings?.cartGoals?.freeGift?.threshold) || 500,
          bucket: Array.isArray(settings?.cartGoals?.freeGift?.bucket)
            ? settings.cartGoals.freeGift.bucket
            : [],
          maxItems: Number(settings?.cartGoals?.freeGift?.maxItems) || 1,
        },
      },
      shop: {
        lat: Number.isFinite(shopLat) ? shopLat : null,
        lng: Number.isFinite(shopLng) ? shopLng : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { deliveryBuffer, deliveryRange, showProductQuantity, cartGoals } = req.body;

    const patch = {};
    if (deliveryBuffer !== undefined) {
      const value = Number(deliveryBuffer);
      if (Number.isNaN(value) || value < 5 || value > 30) {
        return res.status(400).json({ message: 'deliveryBuffer must be between 5 and 30 minutes' });
      }
      patch.deliveryBuffer = value;
    }

    const rangeValidation = validateDeliveryRange(deliveryRange);
    if (!rangeValidation.ok) {
      return res.status(400).json({ message: rangeValidation.message || 'Invalid deliveryRange' });
    }
    if (rangeValidation.value !== undefined) {
      patch.deliveryRange = rangeValidation.value;
    }

    const showProductQuantityValue = normalizeBoolean(showProductQuantity);
    if (showProductQuantity !== undefined && showProductQuantityValue === undefined) {
      return res.status(400).json({ message: 'showProductQuantity must be a boolean' });
    }
    if (showProductQuantityValue !== undefined) {
      patch.showProductQuantity = showProductQuantityValue;
    }

    const goalsValidation = validateCartGoals(cartGoals);
    if (!goalsValidation.ok) {
      return res.status(400).json({ message: goalsValidation.message || 'Invalid cartGoals' });
    }
    if (goalsValidation.value !== undefined && Object.keys(goalsValidation.value).length > 0) {
      patch.cartGoals = goalsValidation.value;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'No valid settings to update' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(patch);
    } else {
      if (patch.deliveryBuffer !== undefined) settings.deliveryBuffer = patch.deliveryBuffer;
      if (patch.deliveryRange !== undefined) settings.deliveryRange = patch.deliveryRange;
      if (patch.showProductQuantity !== undefined) settings.showProductQuantity = patch.showProductQuantity;
      if (patch.cartGoals !== undefined) {
        settings.cartGoals = {
          ...(settings.cartGoals?.toObject ? settings.cartGoals.toObject() : (settings.cartGoals || {})),
          ...(patch.cartGoals || {}),
          freeDelivery: {
            ...(settings.cartGoals?.freeDelivery?.toObject ? settings.cartGoals.freeDelivery.toObject() : (settings.cartGoals?.freeDelivery || {})),
            ...(patch.cartGoals?.freeDelivery || {}),
          },
          freeGift: {
            ...(settings.cartGoals?.freeGift?.toObject ? settings.cartGoals.freeGift.toObject() : (settings.cartGoals?.freeGift || {})),
            ...(patch.cartGoals?.freeGift || {}),
          },
        };
      }
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
