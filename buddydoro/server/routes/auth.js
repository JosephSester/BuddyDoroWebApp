const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();
const jwt = require('jsonwebtoken');
const inventory = require('../models/Inventory');

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set! Authentication will fail.");
}

// REGISTER
router.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      passwordHash: hashedPassword
    });

    await user.save();

    await inventory.create({ userId: user._id, items: [] });
    res.status(201).json({ message: 'User created' });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});


// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.email);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // CREATE TOKEN
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET, // this must now have a value
      { expiresIn: '7d' }
    );

    console.log('Login successful:', email);
    return res.json({
      message: 'Login successful',
      userId: user._id,
      token,
      name: user.name,
      doros: user.doros,
      diamonds: user.diamonds,
      companionStatuses: user.companionStatuses,
      hasSeenOnboarding: user.hasSeenOnboarding,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// me route to get user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      doros: user.doros,
      diamonds: user.diamonds,
      companionStatuses: user.companionStatuses,
      lastSessionEnd: user.lastSessionEnd,
      hasSeenOnboarding: user.hasSeenOnboarding,
      settings: user.settings,
    });

  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE PROFILE (change display name)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { name: name.trim() },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ message: 'Profile updated', name: user.name });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE ACCOUNT (change password & email; current email stays read-only in UI)
router.put('/account', async (req, res) => {
  try {
    // ------------------------------
    // 1️⃣ Extract and verify JWT
    // ------------------------------

    const authHeader = req.headers.authorization;

    // If no Authorization header was sent
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Format should be: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the token using your JWT secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token expired or invalid
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // ------------------------------
    // 2️⃣ Find the logged-in user
    // ------------------------------

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ------------------------------
    // 3️⃣ Extract data from request body
    // ------------------------------

    // Frontend may send:
    // { email }
    // OR { currentPassword, newPassword }
    // OR both

    const email = (req.body.email || req.body.newEmail || '').trim();
    const currentPassword = req.body.currentPassword || '';
    const newPassword = req.body.newPassword || '';

    // ------------------------------
    // 4️⃣ Handle Email Change (optional)
    // ------------------------------

    if (email) {
      // Normalize email to lowercase for consistency
      user.email = email.toLowerCase();
    }

    // ------------------------------
    // 5️⃣ Handle Password Change (optional)
    // ------------------------------

    if (newPassword) {
      // Require current password if changing password
      if (!currentPassword) {
        return res.status(400).json({
          message: 'Current password is required to change password'
        });
      }

      // Compare current password with stored hash
      const passwordMatches = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          message: 'Current password is incorrect'
        });
      }

      // Hash the new password before saving
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // ------------------------------
    // 6️⃣ Prevent empty update
    // ------------------------------

    if (!email && !newPassword) {
      return res.status(400).json({
        message: 'Nothing to update'
      });
    }

    // ------------------------------
    // 7️⃣ Save changes to database
    // ------------------------------

    await user.save();

    // ------------------------------
    // 8️⃣ Send success response
    // ------------------------------

    return res.json({
      message: 'Account updated',
      email: user.email
    });

  } catch (err) {

    // ------------------------------
    // 9️⃣ Handle duplicate email errors
    // ------------------------------

    // If your User schema has: email: { unique: true }
    // MongoDB throws error code 11000 for duplicates
    if (err && err.code === 11000) {
      return res.status(409).json({
        message: 'Email already exists'
      });
    }

    // Log unexpected errors
    console.error('Update account error:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router;
