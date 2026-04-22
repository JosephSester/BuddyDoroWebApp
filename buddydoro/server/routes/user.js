// routes/user.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware'); // your JWT middleware file
const User = require('../models/User');

const STATUS_KEYS = ['health', 'happiness', 'thirst', 'hunger'];
const clampStatus = (n) => Math.max(0, Math.min(14, Number(n) || 0));

function normalizePreferenceValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function serializeUserPreferences(user) {
  return {
    skinOpen: user?.preferences?.skinOpen || null,
    skinClosed: user?.preferences?.skinClosed || null,
    background: user?.preferences?.background || null,
  };
}

function applyPreferenceUpdates(user, input = {}) {
  if (!user.preferences) user.preferences = {};

  const nextSkinOpen = input.skinOpen !== undefined
    ? normalizePreferenceValue(input.skinOpen)
    : undefined;
  const nextSkinClosed = input.skinClosed !== undefined
    ? normalizePreferenceValue(input.skinClosed)
    : undefined;
  const nextBackground = input.background !== undefined
    ? normalizePreferenceValue(input.background)
    : undefined;

  if (nextSkinOpen !== undefined) user.preferences.skinOpen = nextSkinOpen;
  if (nextSkinClosed !== undefined) user.preferences.skinClosed = nextSkinClosed;
  if (nextBackground !== undefined) user.preferences.background = nextBackground;
}

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

router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const { focusMinutes, breakMinutes } = req.body;
    const update = {};

    if (focusMinutes !== undefined) {
      const val = Number(focusMinutes);
      if (isNaN(val) || val < 1 || val > 120) {
        return res.status(400).json({ error: 'focusMinutes must be between 1 and 120' });
      }
      update['settings.focusMinutes'] = val;
    }

    if (breakMinutes !== undefined) {
      const val = Number(breakMinutes);
      if (isNaN(val) || val < 1 || val > 60) {
        return res.status(400).json({ error: 'breakMinutes must be between 1 and 60' });
      }
      update['settings.breakMinutes'] = val;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: update },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ settings: user.settings });
  } catch (err) {
    console.error('PATCH /user/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.patch('/onboarding', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    applyPreferenceUpdates(user, req.body || {});
    user.hasSeenOnboarding = true;
    await user.save();
    res.json({
      hasSeenOnboarding: user.hasSeenOnboarding,
      preferences: serializeUserPreferences(user),
    });
  } catch (err) {
    console.error('PATCH /user/onboarding error:', err);
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
});

router.patch('/preferences', authMiddleware, async (req, res) => {
  try {
    const { skinOpen, skinClosed, background } = req.body || {};
    const hasAnyField =
      skinOpen !== undefined ||
      skinClosed !== undefined ||
      background !== undefined;

    if (!hasAnyField) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    applyPreferenceUpdates(user, { skinOpen, skinClosed, background });
    await user.save();

    res.json({ preferences: serializeUserPreferences(user) });
  } catch (err) {
    console.error('PATCH /user/preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.patch('/life', authMiddleware, async (req, res) => {
  try {
    const { current, max, resetDecay, lastSessionEnd } = req.body;

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
    if (lastSessionEnd && isNaN(Date.parse(lastSessionEnd))) {
      return res.status(400).json({ error: 'lastSessionEnd must be a valid ISO date string' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update fields only if provided
    if (current !== undefined) user.life.current = current;
    if (max !== undefined) user.life.max = max;

    // Reset decay timer if requested (e.g. after care action)
    if (resetDecay) {
      user.lastCareAt = new Date();
    }

    // Update last session end time (for offline decay calculation)
    if (lastSessionEnd) {
      user.lastSessionEnd = new Date(lastSessionEnd);
    }

    await user.save();

    // Return updated values
    res.json({
      life: {
        current: user.life.current,
        max: user.life.max
      },
      lastCareAt: user.lastCareAt,
      lastSessionEnd: user.lastSessionEnd
    });
  } catch (err) {
    console.error('PATCH /user/life error:', err);
    res.status(500).json({ error: 'Failed to update life' });
  }
});

router.patch('/statuses', authMiddleware, async (req, res) => {
  try {
    const { health, happiness, thirst, hunger } = req.body || {};

    if (health !== undefined) {
      return res.status(400).json({ error: 'health is derived and cannot be set directly' });
    }

    const hasAny =
      happiness !== undefined ||
      thirst !== undefined ||
      hunger !== undefined;

    if (!hasAny) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    for (const [key, value] of Object.entries({ happiness, thirst, hunger })) {
      if (value === undefined) continue;
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 14) {
        return res.status(400).json({ error: `${key} must be a number between 0 and 14` });
      }
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.companionStatuses) {
      user.companionStatuses = {
        health: 14,
        happiness: 14,
        thirst: 14,
        hunger: 14
      };
    }

    if (happiness !== undefined) user.companionStatuses.happiness = clampStatus(happiness);
    if (thirst !== undefined) user.companionStatuses.thirst = clampStatus(thirst);
    if (hunger !== undefined) user.companionStatuses.hunger = clampStatus(hunger);

    // Health is derived from the 3 primary statuses; keep stored value aligned.
    const derivedHealth = Math.floor(
      (user.companionStatuses.happiness + user.companionStatuses.thirst + user.companionStatuses.hunger) / 3
    );
    user.companionStatuses.health = clampStatus(derivedHealth);

    // Ensure all status fields are clamped before saving.
    for (const key of STATUS_KEYS) {
      user.companionStatuses[key] = clampStatus(user.companionStatuses[key]);
    }

    await user.save();
    res.json({ companionStatuses: user.companionStatuses });
  } catch (err) {
    console.error('PATCH /user/statuses error:', err);
    res.status(500).json({ error: 'Failed to update statuses' });
  }
});

module.exports = router;
