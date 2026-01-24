const express = require('express');
const Inventory = require('../models/Inventory');
const authMiddleware = require('../authMiddleware');
const router = express.Router();

// GET user's inventory
router.get('/', authMiddleware, async (req, res) => {
    try {
        let inventory = await Inventory.findOne({ userId: req.user.userId });

        // If no inventory exists, create an empty one
        if (!inventory) {
            inventory = new Inventory({
                userId: req.user.userId,
                items: []
            });
            await inventory.save();
        }

        // Transform to frontend format
        res.json({
            id: inventory._id.toString(),
            items: inventory.items || []
        });
    } catch (error) {
        console.error('GET /api/inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST purchase an item
router.post('/purchase', authMiddleware, async (req, res) => {
    try {
        const { sku } = req.body;

        // Validate input
        if (!sku || typeof sku !== 'string') {
            return res.status(400).json({ error: 'Item sku is required' });
        }

        // Find or create inventory
        let inventory = await Inventory.findOne({ userId: req.user.userId });
        if (!inventory) {
            inventory = new Inventory({
                userId: req.user.userId,
                items: []
            });
        }

        // Add or increment item
        const existingItem = inventory.items.find(item => item.sku === sku);
        if (existingItem) {
            existingItem.count += 1;
        } else {
            inventory.items.push({ sku, count: 1 });
        }

        inventory.updatedAt = new Date();
        await inventory.save();

        // Return updated inventory
        res.json({
            id: inventory._id.toString(),
            items: inventory.items
        });
    } catch (error) {
        console.error('POST /api/inventory/purchase error:', error);
        res.status(500).json({ error: 'Failed to purchase item' });
    }
});

// PUT use/consume an item
router.put('/use', authMiddleware, async (req, res) => {
    try {
        const { sku } = req.body;

        // Validate input
        if (!sku || typeof sku !== 'string') {
            return res.status(400).json({ error: 'Item sku is required' });
        }

        // Find inventory
        const inventory = await Inventory.findOne({ userId: req.user.userId });
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }

        // Find item
        const item = inventory.items.find(i => i.sku === sku);
        if (!item || item.count <= 0) {
            return res.status(400).json({ error: 'Item not owned or already used' });
        }

        // Decrement count or remove if last
        item.count -= 1;
        if (item.count === 0) {
            inventory.items = inventory.items.filter(i => i.sku !== sku);
        }

        inventory.updatedAt = new Date();
        await inventory.save();

        res.json({
            id: inventory._id.toString(),
            items: inventory.items
        });
    } catch (error) {
        console.error('PUT /api/inventory/use error:', error);
        res.status(500).json({ error: 'Failed to use item' });
    }
});

// DELETE remove an item entirely (for testing or admin cleanup)
router.delete('/:sku', authMiddleware, async (req, res) => {
    try {
        const { sku } = req.params;

        const inventory = await Inventory.findOne({ userId: req.user.userId });
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }

        inventory.items = inventory.items.filter(item => item.sku !== sku);
        inventory.updatedAt = new Date();
        await inventory.save();

        res.json({
            id: inventory._id.toString(),
            items: inventory.items
        });
    } catch (error) {
        console.error('DELETE /api/inventory/:sku error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

module.exports = router;
