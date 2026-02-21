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

router.patch('/diamonds', authMiddleware, async (req, res) => {
  try {
    const { delta } = req.body;

    if (typeof delta !== 'number' || isNaN(delta)) {
      return res.status(400).json({ error: 'delta must be a number' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.diamonds = Math.max(0, (user.diamonds || 0) + delta);
    await user.save();

    res.json({ diamonds: user.diamonds });
  } catch (err) {
    console.error('PATCH /user/diamonds error:', err);
    res.status(500).json({ error: 'Failed to update Diamonds' });
  }
});

// // Optional: GET for current balance (if you want redundancy)
// router.get('/doros', authMiddleware, async (req, res) => {
//   const user = await User.findById(req.user.userId);
//   if (!user) return res.status(404).json({ error: 'User not found' });
//   res.json({ doros: user.doros });
// });

module.exports = router;