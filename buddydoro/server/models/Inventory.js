const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            sku: {
                type: String,
                required: true
            },
            count: {
                type: Number,
                default: 1,
                min: 0
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure each user has unique inventory (no duplicates)
inventorySchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
