const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'play', 'water', 'medicine', 'skins', 'backgrounds', 'accessory', 'special'],
  },
  currency: {
    type: String,
    enum: ['doros', 'diamonds'],
    default: 'doros',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  // Purchase currency for store buy flow.
  currency: {
    type: String,
    enum: ['doros', 'diamonds'],
    default: 'doros',
  },
  emoji: {
    type: String,
    default: '🎁',
  },
  description: {
    type: String,
    trim: true,
  },
  // For skins/backgrounds: path relative to assets/artwork/ (e.g. 'Skins/Alien.png')
  // Used for both the preview thumbnail and the equip path saved to localStorage
  imageUrl: String,
  // Companion stat effect when consumed
  effect: {
    stat:   { type: String, enum: ['hunger', 'thirst', 'happiness', 'health'] },
    amount: { type: Number, min: 1 },
  },
  isLimited:      { type: Boolean, default: false },
  stockLeft:      { type: Number,  default: -1 },
  availableFrom:  Date,
  availableUntil: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

itemSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Item', itemSchema);
