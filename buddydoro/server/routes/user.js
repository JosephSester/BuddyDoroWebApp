// routes/user.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware'); // your JWT middleware file
const User = require('../models/User');

router.patch('/doros', authMiddleware, async (req, res) => {
  try {
    const { delta } = req.body;

    // Basic validation
    if (typeof delta !== 'number' || isNaN(delta)) {
      return res.status(400).json({ error: 'delta must be a number' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update balance (prevent negative)
    user.doros = Math.max(0, (user.doros || 0) + delta);
    await user.save();

    // Return updated value (what frontend expects)
    res.json({ doros: user.doros });
  } catch (err) {
    console.error('PATCH /user/doros error:', err);
    res.status(500).json({ error: 'Failed to update Doros' });
  }
});

router.patch('/life', authMiddleware, async (req, res) => {
  try {
    const { current, max, resetDecay, lastDecay } = req.body;

    // Validation
    if (current !== undefined && (typeof current !== 'number' || current < 0 || current > 14)) {
      return res.status(400).json({ error: 'current must be a number between 0 and 14' });
    }
    if (max !== undefined && (typeof max !== 'number' || max < 1 || max > 14)) {
      return res.status(400).json({ error: 'max must be a number between 1 and 14' });
    }
    if (resetDecay !== undefined && typeof resetDecay !== 'boolean') {
      return res.status(400).json({ error: 'resetDecay must be boolean' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update fields if provided
    if (current !== undefined) user.life.current = current;
    if (max !== undefined) user.life.max = max;
    if (resetDecay) {
      user.lastCareAt = new Date();
      user.lastActiveAt = new Date(); // Update lastActiveAt as well
    }


    // Optional: reset lastLogin or add a lastCare timestamp if you want decay clock
    // For now we'll just save — add lastCare field later if needed

    await user.save();

    res.json({
      life: {
        current: user.life.current,
        max: user.life.max
      },
      lastCareAt: user.lastCareAt,
    });
  } catch (err) {
    console.error('PATCH /user/life error:', err);
    res.status(500).json({ error: 'Failed to update life' });
  }
});

// // Optional: GET for current balance (if you want redundancy)
// router.get('/doros', authMiddleware, async (req, res) => {
//   const user = await User.findById(req.user.userId);
//   if (!user) return res.status(404).json({ error: 'User not found' });
//   res.json({ doros: user.doros });
// });

module.exports = router;