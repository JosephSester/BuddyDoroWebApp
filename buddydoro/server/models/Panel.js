const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Goal',
        trim: true,
        maxlength: 100
    },
    order: {
        type: Number,
        default: 0,
        index: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

panelSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('Panel', panelSchema);
