const rateLimit = require('express-rate-limit');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Rate limiter middleware
 * Limits requests per IP to prevent abuse
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHelper.error(res, 'Too many requests, please try again later.', 429);
  },
});

/**
 * Stricter rate limiter for message sending
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHelper.error(res, 'Message rate limit exceeded. Max 30 messages per minute.', 429);
  },
});

module.exports = { rateLimiter, messageLimiter };
