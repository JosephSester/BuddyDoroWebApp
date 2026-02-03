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
      doros: 1250,
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
      { expiresIn: '1h' }
    );

    console.log('Login successful:', email);
    return res.json({
      message: 'Login successful',
      userId: user._id,
      token,
      name: user.name,
      doros: user.doros,
      diamonds: user.diamonds,
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
      doros: user.doros,
      diamonds: user.diamonds
    });

  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
