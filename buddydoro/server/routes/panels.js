const express = require('express');
const Panel = require('../models/Panel');
const Task = require('../models/Task');
const authMiddleware = require('../authMiddleware');

const router = express.Router();

// Get all panels for user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const panels = await Panel.find({ userId: req.user.userId }).sort({ order: 1, createdAt: 1 });
        const out = panels.map(p => ({
            id: p._id.toString(),
            title: p.title,
            order: p.order,
            dueDate: p.dueDate ? p.dueDate.toISOString() : null,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));
        res.json(out);
    } catch (err) {
        console.error('GET /api/panels error:', err);
        res.status(500).json({ error: 'Failed to fetch panels' });
    }
});

// Create a panel
router.post('/', authMiddleware, async (req, res) => {
    try {
        const title = (req.body.title || 'Goal').toString().trim().slice(0, 100);
        const order = Number.isFinite(req.body.order) ? Number(req.body.order) : 0;
        const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

        // Compute default order to append to end
        const max = await Panel.find({ userId: req.user.userId }).sort({ order: -1 }).limit(1);
        const nextOrder = max.length ? (max[0].order + 1) : 0;

        const panel = new Panel({
            userId: req.user.userId,
            title: title || 'Goal',
            order: Number.isFinite(order) ? order : nextOrder,
            dueDate
        });
        await panel.save();
        res.status(201).json({
            id: panel._id.toString(),
            title: panel.title,
            order: panel.order,
            dueDate: panel.dueDate ? panel.dueDate.toISOString() : null,
            createdAt: panel.createdAt,
            updatedAt: panel.updatedAt
        });
    } catch (err) {
        console.error('POST /api/panels error:', err);
        res.status(500).json({ error: 'Failed to create panel' });
    }
});

// Update a panel (title/order)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const panel = await Panel.findById(req.params.id);
        if (!panel) return res.status(404).json({ error: 'Panel not found' });
        if (panel.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not your panel' });
        }

        if (req.body.title !== undefined) {
            const t = (req.body.title || '').toString().trim().slice(0, 100);
            if (t) panel.title = t; else panel.title = 'Goal';
        }
        if (req.body.order !== undefined && Number.isFinite(req.body.order)) {
            panel.order = Number(req.body.order);
        }
        if (req.body.dueDate !== undefined) {
            panel.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
        }

        panel.updatedAt = new Date();
        await panel.save();

        res.json({
            id: panel._id.toString(),
            title: panel.title,
            order: panel.order,
            dueDate: panel.dueDate ? panel.dueDate.toISOString() : null,
            createdAt: panel.createdAt,
            updatedAt: panel.updatedAt
        });
    } catch (err) {
        console.error('PUT /api/panels/:id error:', err);
        res.status(500).json({ error: 'Failed to update panel' });
    }
});

// Reorder panels (bulk)
router.post('/reorder', authMiddleware, async (req, res) => {
    try {
        const items = Array.isArray(req.body) ? req.body : [];
        const updates = items.map(i => ({ id: String(i.id), order: Number(i.order) }));

        const userPanels = await Panel.find({ userId: req.user.userId });
        const allowed = new Set(userPanels.map(p => p._id.toString()));

        for (const u of updates) {
            if (!allowed.has(u.id) || !Number.isFinite(u.order)) continue;
            await Panel.updateOne({ _id: u.id }, { $set: { order: u.order, updatedAt: new Date() } });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /api/panels/reorder error:', err);
        res.status(500).json({ error: 'Failed to reorder panels' });
    }
});

// Delete a panel (supports cascade delete or move tasks)
// DELETE /api/panels/:id?moveTo=<panelId>
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const panel = await Panel.findById(req.params.id);
        if (!panel) return res.status(404).json({ error: 'Panel not found' });
        if (panel.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Not your panel' });
        }

        const moveTo = req.query.moveTo ? String(req.query.moveTo) : null;

        if (moveTo) {
            // Validate move target belongs to the same user
            const target = await Panel.findById(moveTo);
            if (!target || target.userId.toString() !== req.user.userId) {
                return res.status(400).json({ error: 'Invalid moveTo panel' });
            }
            await Task.updateMany({ userId: req.user.userId, panelId: panel._id.toString() }, { $set: { panelId: target._id.toString() } });
        } else {
            // Cascade delete tasks in this panel
            await Task.deleteMany({ userId: req.user.userId, panelId: panel._id.toString() });
        }

        await Panel.findByIdAndDelete(panel._id);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/panels/:id error:', err);
        res.status(500).json({ error: 'Failed to delete panel' });
    }
});

module.exports = router;
