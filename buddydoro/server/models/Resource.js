const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:      { type: String, enum: ['video', 'book', 'web'], required: true },
    title:     { type: String, required: true, maxlength: 300 },
    url:       { type: String, required: true, maxlength: 2048 },
    thumbnail: { type: String, default: null },
    author:    { type: String, default: null },
    note:      { type: String, default: '', maxlength: 2000 },
    query:     { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

resourceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
