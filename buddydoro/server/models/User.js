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

  createdAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: {
    type: Date
  }
});

module.exports = mongoose.model('User', userSchema);

