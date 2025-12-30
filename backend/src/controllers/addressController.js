import User from '../models/User.js';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toTrimmedString(v) {
  if (v == null) return '';
  return String(v).trim();
}

function normalizeKeyPart(v) {
  return toTrimmedString(v).toLowerCase().replace(/\s+/g, ' ');
}

function makeAddressKey({ street, city, state, pincode } = {}) {
  return [street, city, state, pincode].map(normalizeKeyPart).join('|');
}

function parseLocation(loc) {
  const latRaw = loc?.lat;
  const lngRaw = loc?.lng;
  const lat = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
  const lng = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function sortAddresses(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const ad = a?.isDefault ? 1 : 0;
    const bd = b?.isDefault ? 1 : 0;
    if (ad !== bd) return bd - ad;

    const at = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bt = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bt - at;
  });
}

// @desc    List saved addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
export const listMyAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('savedAddresses');
    const addresses = user?.savedAddresses ? user.savedAddresses.map((a) => a.toObject()) : [];
    res.json(sortAddresses(addresses));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update a saved address (deduped by address text)
// @route   POST /api/addresses
// @access  Private
export const upsertMyAddress = async (req, res) => {
  try {
    const payload = req.body || {};

    const next = {
      label: toTrimmedString(payload.label),
      name: toTrimmedString(payload.name),
      phone: toTrimmedString(payload.phone),
      street: toTrimmedString(payload.street),
      city: toTrimmedString(payload.city),
      state: toTrimmedString(payload.state),
      pincode: toTrimmedString(payload.pincode),
      location: parseLocation(payload.location),
    };

    if (!isNonEmptyString(next.street) || !isNonEmptyString(next.city) || !isNonEmptyString(next.state) || !isNonEmptyString(next.pincode)) {
      return res.status(400).json({ message: 'street, city, state and pincode are required' });
    }

    const setDefault = Boolean(payload.setDefault);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.savedAddresses = user.savedAddresses || [];

    const key = makeAddressKey(next);
    let target = null;

    for (const addr of user.savedAddresses) {
      const addrKey = makeAddressKey(addr);
      if (addrKey === key) {
        target = addr;
        break;
      }
    }

    const isFirst = user.savedAddresses.length === 0;

    if (!target) {
      user.savedAddresses.push({
        ...next,
        // if label isn't provided, keep empty (frontend can show street summary)
        isDefault: isFirst || setDefault,
      });
      target = user.savedAddresses[user.savedAddresses.length - 1];
    } else {
      target.label = next.label;
      target.name = next.name;
      target.phone = next.phone;
      target.street = next.street;
      target.city = next.city;
      target.state = next.state;
      target.pincode = next.pincode;
      // Only overwrite location if provided (avoids wiping stored coords)
      if (next.location) {
        target.location = next.location;
      }
      if (setDefault) {
        target.isDefault = true;
      }
    }

    if (setDefault || isFirst) {
      for (const addr of user.savedAddresses) {
        if (String(addr._id) !== String(target._id)) {
          addr.isDefault = false;
        }
      }
    }

    await user.save();

    const safe = target.toObject();
    res.status(201).json(safe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a saved address by id
// @route   PUT /api/addresses/:id
// @access  Private
export const updateMyAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addr = user.savedAddresses?.id(id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    if (payload.label !== undefined) addr.label = toTrimmedString(payload.label);
    if (payload.name !== undefined) addr.name = toTrimmedString(payload.name);
    if (payload.phone !== undefined) addr.phone = toTrimmedString(payload.phone);
    if (payload.street !== undefined) addr.street = toTrimmedString(payload.street);
    if (payload.city !== undefined) addr.city = toTrimmedString(payload.city);
    if (payload.state !== undefined) addr.state = toTrimmedString(payload.state);
    if (payload.pincode !== undefined) addr.pincode = toTrimmedString(payload.pincode);

    const loc = payload.location !== undefined ? parseLocation(payload.location) : undefined;
    if (payload.location !== undefined) {
      addr.location = loc;
    }

    if (!isNonEmptyString(addr.street) || !isNonEmptyString(addr.city) || !isNonEmptyString(addr.state) || !isNonEmptyString(addr.pincode)) {
      return res.status(400).json({ message: 'street, city, state and pincode are required' });
    }

    if (payload.setDefault) {
      for (const a of user.savedAddresses) {
        a.isDefault = String(a._id) === String(addr._id);
      }
    }

    await user.save();
    res.json(addr.toObject());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a saved address by id
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteMyAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addr = user.savedAddresses?.id(id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    const wasDefault = Boolean(addr.isDefault);
    addr.deleteOne();

    if (wasDefault) {
      const remaining = user.savedAddresses || [];
      if (remaining.length > 0) {
        remaining[0].isDefault = true;
        for (let i = 1; i < remaining.length; i++) remaining[i].isDefault = false;
      }
    }

    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set default address by id
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultMyAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const addr = user.savedAddresses?.id(id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    for (const a of user.savedAddresses) {
      a.isDefault = String(a._id) === String(id);
    }

    await user.save();
    res.json(addr.toObject());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
