const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    panelId: {
        type: String,
        default: 'tasksPanel-1'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    subtasks: [{
        _id:      false,
        id:       { type: String,  required: true },
        title:    { type: String,  required: true },
        estimate: { type: Number,  default: null },
        done:     { type: Boolean, default: false },
    }],
});

module.exports = mongoose.model('Task', taskSchema);
