const config = require('../config/env');
const logger = require('../config/logger');
const ResponseHelper = require('../utils/responseHelper');

/**
 * API Key authentication middleware
 * Validates x-api-key header against configured API_KEY
 */
function authMiddleware(req, res, next) {
  // Skip auth if API_KEY is not configured (development)
  if (!config.apiKey) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Request without API key', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
    });
    return ResponseHelper.error(res, 'API key is required. Provide it via x-api-key header.', 401);
  }

  if (apiKey !== config.apiKey) {
    logger.warn('Request with invalid API key', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
    });
    return ResponseHelper.error(res, 'Invalid API key', 401);
  }

  next();
}

module.exports = authMiddleware;
