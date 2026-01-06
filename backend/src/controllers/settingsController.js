import Settings from '../models/Settings.js';

function isTimeString(v) {
  const s = String(v || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function normalizeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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
    const { deliveryBuffer, deliveryRange } = req.body;

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

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'No valid settings to update' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(patch);
    } else {
      if (patch.deliveryBuffer !== undefined) settings.deliveryBuffer = patch.deliveryBuffer;
      if (patch.deliveryRange !== undefined) settings.deliveryRange = patch.deliveryRange;
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
