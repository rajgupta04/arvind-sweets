import Offer from '../models/Offer.js';

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const normalizeLink = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
};

const isValidLink = (v) => {
  if (!isNonEmptyString(v)) return false;
  const s = String(v).trim();
  return s.startsWith('/') || /^https?:\/\//i.test(s);
};

const makeOfferPayload = (body = {}) => {
  const payload = {
    title: isNonEmptyString(body.title) ? String(body.title).trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    ctaText: typeof body.ctaText === 'string' ? body.ctaText.trim() : '',
    ctaLink: normalizeLink(body.ctaLink),
    active: typeof body.active === 'boolean' ? body.active : Boolean(body.active),
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
  };

  if (payload.startsAt && Number.isNaN(payload.startsAt.getTime())) payload.startsAt = null;
  if (payload.endsAt && Number.isNaN(payload.endsAt.getTime())) payload.endsAt = null;

  return payload;
};

// @desc    Get active offer (public)
// @route   GET /api/offers/active
// @access  Public
export const getActiveOffer = async (req, res) => {
  try {
    const now = new Date();

    const offer = await Offer.findOne({
      active: true,
      $and: [
        {
          $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
        },
        {
          $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
        },
      ],
    }).sort({ updatedAt: -1, createdAt: -1 });

    res.json(offer || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List offers (admin)
// @route   GET /api/offers
// @access  Private/Admin
export const listOffers = async (req, res) => {
  try {
    const offers = await Offer.find({}).sort({ updatedAt: -1, createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create offer (admin)
// @route   POST /api/offers
// @access  Private/Admin
export const createOffer = async (req, res) => {
  try {
    const payload = makeOfferPayload(req.body);

    if (!isNonEmptyString(payload.title)) {
      return res.status(400).json({ message: 'title is required' });
    }

    if (payload.ctaText && !isNonEmptyString(payload.ctaText)) {
      return res.status(400).json({ message: 'ctaText must be a non-empty string' });
    }

    if (payload.ctaLink && !isValidLink(payload.ctaLink)) {
      return res.status(400).json({ message: 'ctaLink must start with / or http(s)://' });
    }

    if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
      return res.status(400).json({ message: 'startsAt must be before endsAt' });
    }

    const created = await Offer.create(payload);

    if (created.active) {
      await Offer.updateMany({ _id: { $ne: created._id } }, { $set: { active: false } });
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update offer (admin)
// @route   PUT /api/offers/:id
// @access  Private/Admin
export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const payload = makeOfferPayload({ ...offer.toObject(), ...req.body });

    if (!isNonEmptyString(payload.title)) {
      return res.status(400).json({ message: 'title is required' });
    }

    if (payload.ctaLink && !isValidLink(payload.ctaLink)) {
      return res.status(400).json({ message: 'ctaLink must start with / or http(s)://' });
    }

    if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
      return res.status(400).json({ message: 'startsAt must be before endsAt' });
    }

    offer.title = payload.title;
    offer.description = payload.description;
    offer.ctaText = payload.ctaText;
    offer.ctaLink = payload.ctaLink;
    offer.active = Boolean(payload.active);
    offer.startsAt = payload.startsAt;
    offer.endsAt = payload.endsAt;

    const updated = await offer.save();

    if (updated.active) {
      await Offer.updateMany({ _id: { $ne: updated._id } }, { $set: { active: false } });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete offer (admin)
// @route   DELETE /api/offers/:id
// @access  Private/Admin
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    await offer.deleteOne();
    res.json({ message: 'Offer removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
