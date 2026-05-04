const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        sparse: true    // Allows null values (legacy reviews may not have id)
    },
    route: {
        type: String,
        required: true,
        index: true     // Index for filtering by route
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000
    },
    reviewText: {
        type: String,
        maxlength: 2000
    },
    author: {
        type: String,
        default: 'Anonymous User'
    },
    userName: {
        type: String,
        default: 'Anonymous User'
    },
    userId: {
        type: String,
        default: null,
        index: true     // Index for user-specific queries
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true    // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Review', reviewSchema);