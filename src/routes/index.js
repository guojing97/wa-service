const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { rateLimiter } = require('../middlewares/rateLimiter');
const sessionRoutes = require('./sessionRoutes');
const messageRoutes = require('./messageRoutes');

// Apply global rate limiter
router.use(rateLimiter);

// Apply API key authentication to all routes
router.use(authMiddleware);

// Mount routes
router.use('/session', sessionRoutes);
router.use('/message', messageRoutes);

module.exports = router;
