const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subtaskName: { type: String, default: 'Unassigned' },
  taskName:    { type: String, default: '' },
  seconds:     { type: Number, required: true },
  completedAt: { type: Date,   default: Date.now },
});

module.exports = mongoose.model('FocusSession', focusSessionSchema);
