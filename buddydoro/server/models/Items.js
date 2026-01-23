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
    enum: ['food', 'play', 'water', 'medicine', 'accessory', 'special'], // expand as needed
  },
  price: {
    type: Number,
    required: true,
    min: 1,
  },
  emoji: {
    type: String,
    default: '🎁',
  },
  description: {
    type: String,
    trim: true,
  },
  imageUrl: String,           // optional — for nicer UI later
  isLimited: { type: Boolean, default: false },
  stockLeft: { type: Number, default: -1 }, // -1 = unlimited
  availableFrom: Date,        // optional scheduling
  availableUntil: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

itemSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Item', itemSchema);