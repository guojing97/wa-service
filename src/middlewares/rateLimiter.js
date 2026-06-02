const rateLimit = require('express-rate-limit');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Rate limiter middleware
 * Limits requests per IP to prevent abuse
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHelper.error(res, 'Too many requests, please try again later.', 429);
  },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseHelper.error(res, 'Message rate limit exceeded. Max 100 messages per minute.', 429);
  },
});

module.exports = { rateLimiter, messageLimiter };
