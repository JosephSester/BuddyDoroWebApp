const express = require('express');
const Inventory = require('../models/Inventory');
const Item      = require('../models/Items');
const User      = require('../models/User');
const authMiddleware = require('../authMiddleware');
const router = express.Router();

// GET user's inventory
router.get('/', authMiddleware, async (req, res) => {
  try {
    let inventory = await Inventory.findOne({ userId: req.user.userId });
    if (!inventory) {
      inventory = new Inventory({ userId: req.user.userId, items: [] });
      await inventory.save();
    }
    res.json({ id: inventory._id.toString(), items: inventory.items || [] });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST purchase an item — deducts doros or diamonds, adds to inventory
router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    const { sku } = req.body;
    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ error: 'Item sku is required' });
    }

    // Look up item catalog entry
    const item = await Item.findOne({ sku: sku.toLowerCase() });
    if (!item) return res.status(404).json({ error: 'Item not found in catalog' });

    // Look up user
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check and deduct currency
    if (item.currency === 'diamonds') {
      if (user.diamonds < item.price) {
        return res.status(400).json({ error: 'Not enough diamonds' });
      }
      user.diamonds -= item.price;
    } else {
      if (user.doros < item.price) {
        return res.status(400).json({ error: 'Not enough Doros' });
      }
      user.doros -= item.price;
    }
    await user.save();

    // Add to inventory
    let inventory = await Inventory.findOne({ userId: req.user.userId });
    if (!inventory) {
      inventory = new Inventory({ userId: req.user.userId, items: [] });
    }

    const existing = inventory.items.find(i => i.sku === sku.toLowerCase());
    if (existing) {
      existing.count += 1;
    } else {
      inventory.items.push({ sku: sku.toLowerCase(), count: 1 });
    }
    inventory.updatedAt = new Date();
    await inventory.save();

    res.json({
      inventory:      { id: inventory._id.toString(), items: inventory.items },
      dorosBalance:    user.doros,
      diamondsBalance: user.diamonds,
    });
  } catch (error) {
    console.error('POST /api/inventory/purchase error:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

// PUT use/consume an item — decrements count and applies companion stat effect
router.put('/use', authMiddleware, async (req, res) => {
  try {
    const { sku } = req.body;
    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ error: 'Item sku is required' });
    }

    const inventory = await Inventory.findOne({ userId: req.user.userId });
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });

    const invItem = inventory.items.find(i => i.sku === sku.toLowerCase());
    if (!invItem || invItem.count <= 0) {
      return res.status(400).json({ error: 'Item not owned or already used' });
    }

    // Decrement
    invItem.count -= 1;
    if (invItem.count === 0) {
      inventory.items = inventory.items.filter(i => i.sku !== sku.toLowerCase());
    }
    inventory.updatedAt = new Date();
    await inventory.save();

    // Apply companion stat effect if item has one
    let companionStatuses = null;
    const itemData = await Item.findOne({ sku: sku.toLowerCase() });
    if (itemData?.effect?.stat && itemData.effect.amount) {
      const user = await User.findById(req.user.userId);
      if (user) {
        const stat = itemData.effect.stat;
        const current = user.companionStatuses?.[stat] ?? 0;
        user.companionStatuses[stat] = Math.min(14, current + itemData.effect.amount);
        user.markModified('companionStatuses');
        await user.save();
        companionStatuses = user.companionStatuses;
      }
    }

    res.json({
      inventory: { id: inventory._id.toString(), items: inventory.items },
      ...(companionStatuses && { companionStatuses }),
    });
  } catch (error) {
    console.error('PUT /api/inventory/use error:', error);
    res.status(500).json({ error: 'Failed to use item' });
  }
});

// DELETE remove an item entirely (admin/testing)
router.delete('/:sku', authMiddleware, async (req, res) => {
  try {
    const { sku } = req.params;
    const inventory = await Inventory.findOne({ userId: req.user.userId });
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
    inventory.items = inventory.items.filter(item => item.sku !== sku);
    inventory.updatedAt = new Date();
    await inventory.save();
    res.json({ id: inventory._id.toString(), items: inventory.items });
  } catch (error) {
    console.error('DELETE /api/inventory/:sku error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
