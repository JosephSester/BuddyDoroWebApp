const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  // Currencies

  doros: {
    type: Number,
    default: 1250,
    min: 0
  },
  diamonds: {
    type: Number,
    default: 0,
    min: 0
  },

  // Life circle

  life: {
    current: {type: Number,
    default: 14,
    min: 0},
    max: {type: Number,
    default: 14,
    min: 1}
  },

  // Companion statuses
  companionStatuses: {
    health: { type: Number, default: 14, min: 0, max: 14 },
    happiness: { type: Number, default: 14, min: 0, max: 14 },
    thirst: { type: Number, default: 14, min: 0, max: 14 },
    hunger: { type: Number, default: 14, min: 0, max: 14 }
  },

  //User preferences

  settings: {
    focusMinutes: {
      type: Number,
      default: 25
    },
    breakMinutes: {
      type: Number,
      default: 5
    },
    theme: {
      type: String,
      default: 'default'
    }
  },

  hasSeenOnboarding: {
    type: Boolean,
    default: false
  },

  lastSessionEnd: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: {
    type: Date
  }
});

module.exports = mongoose.model('User', userSchema);

