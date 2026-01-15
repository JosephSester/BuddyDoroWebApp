const express = require('express');
const router = express.Router();
const authenticateToken = require('../authMiddleware');

// Example protected route
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    message: 'Welcome to your dashboard!',
    userId: req.user.userId
  });
});

module.exports = router;
