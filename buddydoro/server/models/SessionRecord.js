const mongoose = require('mongoose');

const sessionRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  goalName:           { type: String,  default: 'Unknown Goal' },
  pomodorosCompleted: { type: Number,  default: 0 },
  totalSeconds:       { type: Number,  default: 0 },
  goalComplete:       { type: Boolean, default: false },
  completedAt:        { type: Date,    default: Date.now },
});

module.exports = mongoose.model('SessionRecord', sessionRecordSchema);
