const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// ─── Middleware: Log requests ────────────────────────────────────────────────
const logRequest = (req, res, next) => {
    const time = new Date().toLocaleTimeString();
    console.log(`⭐ [${time}] Review Request: ${req.method} ${req.url}`);
    next();
};

// ─── Middleware: Check Session (soft - allows anonymous reviews) ─────────────
const softAuth = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        req.sessionUser = req.session.user;
    } else {
        req.sessionUser = null;
    }
    next();
};

// ─── Middleware: Check Session (strict) ─────────────────────────────────────
const checkSession = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        req.sessionUser = req.session.user;
        next();
    } else {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
};

// ─── GET /reviews ────────────────────────────────────────────────────────────
// Get all reviews sorted newest first
router.get('/', logRequest, async (req, res) => {
    try {
        const { route, sort } = req.query;
        let query = {};

        if (route) query.route = route;

        let sortOption = { createdAt: -1 }; // Default: newest first
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        if (sort === 'highest') sortOption = { rating: -1 };
        if (sort === 'lowest') sortOption = { rating: 1 };

        const reviews = await Review.find(query).sort(sortOption);
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
});

// ─── GET /reviews/stats ──────────────────────────────────────────────────────
// Get aggregate stats for the stats cards
router.get('/stats', logRequest, async (req, res) => {
    try {
        const total = await Review.countDocuments();
        const aggResult = await Review.aggregate([
            { $group: { _id: null, avgRating: { $avg: '$rating' }, positiveCount: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } } } }
        ]);

        const avgRating = aggResult.length > 0 ? aggResult[0].avgRating.toFixed(1) : '0.0';
        const positiveCount = aggResult.length > 0 ? aggResult[0].positiveCount : 0;
        const positivePercent = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

        res.json({ totalReviews: total, averageRating: parseFloat(avgRating), positivePercent });
    } catch (error) {
        console.error('Error fetching review stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// ─── POST /reviews ───────────────────────────────────────────────────────────
// Submit a new review (Session auth)
router.post('/', logRequest, checkSession, async (req, res) => {
    try {
        const { route, rating, reviewText } = req.body;

        // Validate required fields
        if (!route || !rating || !reviewText) {
            return res.status(400).json({ success: false, message: 'Missing required fields: route, rating, reviewText' });
        }

        // Validate rating range
        const parsedRating = parseInt(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        // Count words
        const wordCount = reviewText.trim().split(/\s+/).length;
        if (wordCount > 200) {
            return res.status(400).json({ success: false, message: 'Review exceeds 200 words limit' });
        }

        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const newReview = new Review({
            id: reviewId,
            route,
            rating: parsedRating,
            text: reviewText.trim(),
            reviewText: reviewText.trim(),
            author: req.sessionUser.name || 'Anonymous User',
            userName: req.sessionUser.name || 'Anonymous User',
            userId: req.sessionUser.userId || null,
            date: new Date(),
            createdAt: new Date()
        });

        const savedReview = await newReview.save();
        console.log('✅ Review saved:', savedReview.id, 'by', req.sessionUser.name);

        res.status(201).json({ success: true, message: 'Review submitted successfully!', review: savedReview, id: savedReview.id });
    } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ success: false, message: 'Failed to save review' });
    }
});

// ─── DELETE /reviews/:id ─────────────────────────────────────────────────────
// Delete a review (only the author can delete, verified via session)
router.delete('/:id', logRequest, checkSession, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.sessionUser.userId;
        const userName = req.sessionUser.name;

        // Try find by custom id field first, then by _id
        let review = await Review.findOne({ id: reviewId });
        if (!review) {
            review = await Review.findById(reviewId).catch(() => null);
        }

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Check ownership - user must be the author
        if (review.userId && review.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own reviews' });
        }

        // If no userId stored, check by name (legacy reviews)
        if (!review.userId && review.userName !== userName) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own reviews' });
        }

        // Delete the review
        if (review.id) {
            await Review.deleteOne({ id: reviewId });
        } else {
            await Review.findByIdAndDelete(reviewId);
        }

        console.log('🗑️ Review deleted:', reviewId);
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review' });
    }
});

module.exports = router;