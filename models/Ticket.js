const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true          // Index for fast user-specific queries
    },
    userName: {
        type: String,
        default: 'Anonymous'
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    departureTime: {
        type: String,
        required: true
    },
    arrivalTime: {
        type: String,
        default: 'N/A'
    },
    busName: {
        type: String,
        required: true
    },
    seatNumber: {
        type: String,
        default: 'A1'
    },
    status: {
        type: String,
        enum: ['Upcoming', 'Completed', 'Cancelled'],
        default: 'Upcoming'
    },
    price: {
        type: String,
        default: '₹0'
    }
}, {
    timestamps: true   // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Ticket', ticketSchema);