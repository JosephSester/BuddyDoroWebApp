// server/routes/stripe.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../authMiddleware');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? require('stripe')(stripeSecret) : null;

// GET /api/stripe/config
// Public config endpoint for frontend publishable key.
router.get('/config', (req, res) => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return res.json({
      publishableKey: null,
      stripeEnabled: false,
    });
  }

  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    stripeEnabled: true,
  });
});

// Valid diamond pack amounts in cents (must match frontend DIAMOND_PACKS prices)
const VALID_AMOUNTS = new Set([199, 599, 999, 1999]);

// POST /api/stripe/create-payment-intent
// Requires a valid JWT in Authorization: Bearer <token>
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env.' });
    }

    const { amount } = req.body;

    if (!Number.isInteger(amount) || !VALID_AMOUNTS.has(amount)) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,          // in cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Payment could not be initiated.' });
  }
});

module.exports = router;
