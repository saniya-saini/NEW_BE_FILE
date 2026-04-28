const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    
    reportType: {
        type: String,
        required: [true, 'Report type is required'],
        enum: ['Rash Driving', 'Bus Condition', 'Driver Behavior', 'Other Issue']
    },

    busNumber: {
        type: String,
        required: [true, 'Bus number is required'],
        uppercase: true,    
        trim: true          
    },

    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },

    date: {
        type: String,
        required: [true, 'Date is required']
    },

    time: {
        type: String,
        required: [true, 'Time is required']
    },

    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [10, 'Description must be at least 10 characters']
    },

    severity: {
        type: String,
        required: [true, 'Severity is required'],
        enum: ['low', 'medium', 'high']
    },

    rating: {
        type: String,
        default: 'Not rated'
    },

    submittedBy: {
        type: String,
        default: 'Anonymous'
    },

    userId: {
        type: String,
        default: null
    },

    mirroredToPostgres: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);