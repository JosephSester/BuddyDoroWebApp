const express = require('express');
const Item = require('../models/Items');
const authMiddleware = require('../authMiddleware'); // assuming you have admin role check too
const router = express.Router();

// GET all items (for store frontend) — public or auth
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({}).sort({ category: 1, price: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// GET items by category (optional optimization)
router.get('/category/:cat', async (req, res) => {
  const { cat } = req.params;
  try {
    const items = await Item.find({ category: cat });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST new item — admin only (add role check in middleware if needed)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create item' });
  }
});

// PUT update item — admin
router.put('/:sku', authMiddleware, async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { sku: req.params.sku },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE — admin
router.delete('/:sku', authMiddleware, async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ sku: req.params.sku });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;