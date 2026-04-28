const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');


const logReportRequest = (req, res, next) => {
    const time = new Date().toLocaleTimeString();
    console.log(`📋 [${time}] Report Request: ${req.method} ${req.url}`);
    next();
};

const validateReport = (req, res, next) => {
    const { reportType, busNumber, location, date, time, description, severity } = req.body;

    if (!reportType || !busNumber || !location || !date || !time || !description || !severity) {

        return res.status(400).json({
            success: false,
            message: 'All fields are required: reportType, busNumber, location, date, time, description, severity'
        });
    }

    const busPattern = /^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/;
    if (!busPattern.test(busNumber)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid bus number format. Use format: PB-01-B-2946'
        });
    }

    next();
};

const JWT_SECRET = process.env.JWT_SECRET || 'trackbus_jwt_secret_2025';

const verifyJWT = (req, res, next) => {
    const token = req.cookies.jwtToken || 
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Please log in first.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};


const checkSession = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        // User is logged in via session, attach their info
        req.sessionUser = req.session.user;
        next();
    } else {
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
        });
    }
};
router.get('/', logReportRequest, async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching reports' });
    }
});

router.post('/', logReportRequest, checkSession, validateReport, async (req, res) => {
    try {
        const { reportType, busNumber, location, date, time, description, severity, rating } = req.body;

        const newReport = new Report({
            reportType,
            busNumber,
            location,
            date,
            time,
            description,
            severity,
            rating: rating || 'Not rated',
            submittedBy: req.sessionUser?.name || 'Anonymous',
            userId: req.sessionUser?.userId || null
        });

        const savedReport = await newReport.save();
        console.log('✅ Report saved to MongoDB:', savedReport._id);

        if (severity === 'high') {
            const io = req.app.get('io');
            if (io) {
                io.emit('highSeverityAlert', {
                    message: `🚨 HIGH SEVERITY REPORT: ${reportType} on bus ${busNumber}`,
                    report: savedReport
                });
                console.log('🔴 High severity alert broadcasted via Socket.io');
            }
        }

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully!',
            report: savedReport
        });

    } catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ success: false, message: 'Failed to save report' });
    }
});

router.delete('/:id', logReportRequest, checkSession, async (req, res) => {
    try {
        const reportId = req.params.id;
        const deleted = await Report.findByIdAndDelete(reportId);
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        console.log('🗑️ Report deleted:', reportId);
        res.json({ success: true, message: 'Report deleted successfully' });

    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ success: false, message: 'Failed to delete report' });
    }
});

router.get('/view', async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.render('reports-view', { reports });
    } catch (error) {
        res.status(500).send('Error loading reports page');
    }
});

module.exports = router;