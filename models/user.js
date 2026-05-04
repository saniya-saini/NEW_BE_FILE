const mongoose = require('mongoose');

// The Schema defines the "shape" of the data
const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true // Prevents two users from having the same ID
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: "Not Provided"
    },
    stats: {
        busesTracked: { type: Number, default: 0 },
        reportsHandled: { type: Number, default: 0 }
    },
cookieConsent: {
    type: String,
    enum: ['accepted', 'rejected', 'undecided'],
    default: 'undecided'
}
}, { timestamps: true }); // This automatically adds 'createdAt' and 'updatedAt'

// We compile the Schema into a Model and export it
module.exports = mongoose.model('User', userSchema);