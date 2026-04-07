const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    taskName:  { type: String, default: null },
    body:      { type: String, default: '', maxlength: 10000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

noteSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
