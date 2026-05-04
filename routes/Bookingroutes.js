const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trackbus_jwt_secret_2025';

// ─── Middleware: Check Session ───────────────────────────────────────────────
const checkSession = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        req.sessionUser = req.session.user;
        next();
    } else {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
};

// ─── Middleware: Log requests ────────────────────────────────────────────────
const logRequest = (req, res, next) => {
    const time = new Date().toLocaleTimeString();
    console.log(`🎫 [${time}] Booking Request: ${req.method} ${req.url}`);
    next();
};

// ─── GET /book-ticket/cities ─────────────────────────────────────────────────
// Returns list of cities from db.json (static - can be moved to MongoDB later)
router.get('/cities', logRequest, (req, res) => {
    const cities = [
        { id: '1', name: 'Ambala' }, { id: '2', name: 'Faridabad' },
        { id: '3', name: 'Gurugram' }, { id: '4', name: 'Hisar' },
        { id: '5', name: 'Karnal' }, { id: '6', name: 'Kurukshetra' },
        { id: '7', name: 'Panipat' }, { id: '8', name: 'Rohtak' },
        { id: '9', name: 'Sonipat' }, { id: '10', name: 'Chandigarh' },
        { id: '11', name: 'Amritsar' }, { id: '12', name: 'Bathinda' },
        { id: '13', name: 'Jalandhar' }, { id: '14', name: 'Ludhiana' },
        { id: '15', name: 'Mohali' }, { id: '16', name: 'Patiala' },
        { id: '17', name: 'Pathankot' }, { id: '18', name: 'Rupnagar' },
        { id: '19', name: 'Sangrur' }, { id: '20', name: 'Zirakpur' },
        { id: '21', name: 'Kharar' }, { id: '22', name: 'Jaipur' },
        { id: '23', name: 'Delhi' }
    ];
    res.json(cities);
});

// ─── GET /book-ticket/routes ─────────────────────────────────────────────────
// Returns bus routes with available buses
router.get('/routes', logRequest, (req, res) => {
    const routes = [
        {
            id: '1', from: 'Chandigarh', to: 'Patiala',
            buses: [
                { busId: 'PB01GV3454', name: 'Punjab Roadways', type: 'AC Sleeper', departureTime: '08:30 AM', duration: '1h 30m', arrivalTime: '10:00 AM', price: '500', seatsLeft: 32, amenities: ['AC', 'Sleeper', 'Water Bottle'] },
                { busId: 'PB65GV7867', name: 'CTU Express', type: 'Non-AC Seater', departureTime: '09:00 AM', duration: '1h 45m', arrivalTime: '10:45 AM', price: '120', seatsLeft: 45, amenities: ['Non-AC'] }
            ]
        },
        {
            id: '2', from: 'Ambala', to: 'Ludhiana',
            buses: [
                { busId: 'HR06GV4565', name: 'Haryana Roadways', type: 'AC Seater', departureTime: '09:45 AM', duration: '5h 15m', arrivalTime: '03:00 PM', price: '950', seatsLeft: 18, amenities: ['AC', 'Charging Point'] }
            ]
        },
        {
            id: '3', from: 'Gurugram', to: 'Amritsar',
            buses: [
                { busId: 'PB66GV6756', name: 'Punjab Roadways', type: 'Non-AC Sleeper', departureTime: '10:30 PM', duration: '14h 30m', arrivalTime: '01:00 PM', price: '850', seatsLeft: 25, amenities: ['Sleeper'] }
            ]
        },
        {
            id: '4', from: 'Karnal', to: 'Jalandhar',
            buses: [
                { busId: 'HR45GV6750', name: 'Haryana Roadways', type: 'Non-AC Sleeper', departureTime: '07:15 AM', duration: '5h 45m', arrivalTime: '01:00 PM', price: '380', seatsLeft: 15, amenities: ['Non-AC'] }
            ]
        },
        {
            id: '5', from: 'Patiala', to: 'Hisar',
            buses: [
                { busId: 'PB56GV5431', name: 'Punjab Roadways', type: 'AC Volvo', departureTime: '11:30 AM', duration: '4h 15m', arrivalTime: '03:45 PM', price: '420', seatsLeft: 8, amenities: ['AC', 'WiFi', 'Reclining Seat'] }
            ]
        },
        {
            id: '6', from: 'Delhi', to: 'Chandigarh',
            buses: [
                { busId: 'DL67GV5437', name: 'Volvo A/C Sleeper', type: 'AC Sleeper', departureTime: '08:30 AM', duration: '4h 0m', arrivalTime: '12:30 PM', price: '550', seatsLeft: 22, amenities: ['AC', 'Sleeper', 'Charging Point'] }
            ]
        },
        {
            id: '7', from: 'Chandigarh', to: 'Amritsar',
            buses: [
                { busId: 'PB57GV7766', name: 'Punjab Roadways Express', type: 'Non-AC Seater', departureTime: '10:00 AM', duration: '5h 30m', arrivalTime: '03:30 PM', price: '450', seatsLeft: 30, amenities: ['Non-AC'] }
            ]
        },
        {
            id: '8', from: 'Gurugram', to: 'Jaipur',
            buses: [
                { busId: 'HR90AV4589', name: 'Rajasthan State Deluxe', type: 'AC Seater', departureTime: '07:00 AM', duration: '6h 0m', arrivalTime: '01:00 PM', price: '600', seatsLeft: 12, amenities: ['AC', 'Charging Point'] }
            ]
        }
    ];
    res.json(routes);
});

// ─── GET /book-ticket/tracking ───────────────────────────────────────────────
// Returns live tracking data
router.get('/tracking', logRequest, (req, res) => {
    const tracking = [
        { ticketId: 'TKT123456', currentLocation: { lat: 28.6139, lng: 77.209 }, destination: { lat: 30.7333, lng: 76.7794 }, estimatedArrival: '12:30 PM', currentSpeed: '65 km/h', distanceRemaining: '45 km', nextStop: 'Karnal Bus Terminal', nextStopTime: '11:15 AM', status: 'On Time', lastUpdated: '10:45 AM' },
        { ticketId: 'TKT789012', currentLocation: { lat: 30.7333, lng: 76.7794 }, destination: { lat: 31.634, lng: 74.8723 }, estimatedArrival: '03:30 PM', currentSpeed: '70 km/h', distanceRemaining: '120 km', nextStop: 'Ludhiana Bus Terminal', nextStopTime: '12:00 PM', status: 'On Time', lastUpdated: '10:30 AM' },
        { ticketId: 'TKT345678', currentLocation: { lat: 28.4595, lng: 77.0266 }, destination: { lat: 26.9124, lng: 75.7873 }, estimatedArrival: '01:00 PM', currentSpeed: '75 km/h', distanceRemaining: '200 km', nextStop: 'Behror Bus Stop', nextStopTime: '09:30 AM', status: 'Delayed by 15 min', lastUpdated: '08:45 AM' }
    ];
    res.json(tracking);
});

// ─── GET /book-ticket/tickets ────────────────────────────────────────────────
// Get all tickets for the logged-in user (Session auth)
router.get('/tickets', logRequest, checkSession, async (req, res) => {
    try {
        const userId = req.sessionUser.userId;
        const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
});

// ─── POST /book-ticket ───────────────────────────────────────────────────────
// Book a new ticket (Session auth + body-parser)
router.post('/', logRequest, checkSession, async (req, res) => {
    try {
        const { from, to, date, departureTime, arrivalTime, busName, seatNumber, price } = req.body;

        // Validate required fields
        if (!from || !to || !date || !departureTime || !busName) {
            return res.status(400).json({ success: false, message: 'Missing required fields: from, to, date, departureTime, busName' });
        }

        // Generate ticket ID
        const ticketId = 'TKT' + Math.floor(100000 + Math.random() * 900000);

        const newTicket = new Ticket({
            id: ticketId,
            userId: req.sessionUser.userId,
            userName: req.sessionUser.name,
            from,
            to,
            date,
            departureTime,
            arrivalTime: arrivalTime || 'N/A',
            busName,
            seatNumber: seatNumber || 'A' + Math.floor(1 + Math.random() * 20),
            status: 'Upcoming',
            price: price || '₹0'
        });

        const savedTicket = await newTicket.save();
        console.log('✅ Ticket booked:', savedTicket.id, 'by', req.sessionUser.name);

        res.status(201).json({ success: true, message: 'Ticket booked successfully!', ticket: savedTicket, id: savedTicket.id });
    } catch (error) {
        console.error('Error booking ticket:', error);
        res.status(500).json({ success: false, message: 'Failed to book ticket' });
    }
});

// ─── PATCH /book-ticket/tickets/:id ─────────────────────────────────────────
// Cancel a ticket (Session auth)
router.patch('/tickets/:id', logRequest, checkSession, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { status } = req.body;

        const ticket = await Ticket.findOne({ id: ticketId, userId: req.sessionUser.userId });

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found or unauthorized' });
        }

        if (ticket.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Ticket is already cancelled' });
        }

        ticket.status = status || 'Cancelled';
        ticket.updatedAt = new Date();
        await ticket.save();

        console.log('🚫 Ticket cancelled:', ticketId);
        res.json({ success: true, message: 'Ticket cancelled successfully', ticket });
    } catch (error) {
        console.error('Error cancelling ticket:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel ticket' });
    }
});

module.exports = router;