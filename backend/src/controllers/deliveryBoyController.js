import DeliveryBoy from '../models/DeliveryBoy.js';

// @desc    List delivery boys
// @route   GET /api/delivery-boys
// @access  Private/Admin
export const listDeliveryBoys = async (req, res) => {
  try {
    const isActive = req.query.isActive;
    const filter = {};
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const deliveryBoys = await DeliveryBoy.find(filter).sort({ createdAt: -1 });
    res.json(deliveryBoys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a delivery boy
// @route   POST /api/delivery-boys
// @access  Private/Admin
export const createDeliveryBoy = async (req, res) => {
  try {
    const { name, phone, isActive } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'name and phone are required' });
    }

    const existing = await DeliveryBoy.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Delivery boy with this phone already exists' });
    }

    const created = await DeliveryBoy.create({
      name,
      phone,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update delivery boy active status
// @route   PUT /api/delivery-boys/:id
// @access  Private/Admin
export const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryBoy = await DeliveryBoy.findById(id);
    if (!deliveryBoy) return res.status(404).json({ message: 'Delivery boy not found' });

    if (req.body.name != null) deliveryBoy.name = req.body.name;
    if (req.body.phone != null) deliveryBoy.phone = req.body.phone;
    if (typeof req.body.isActive === 'boolean') deliveryBoy.isActive = req.body.isActive;

    const saved = await deliveryBoy.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
