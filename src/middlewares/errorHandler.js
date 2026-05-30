const logger = require('../config/logger');
const config = require('../config/env');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error
  logger.error('Unhandled error', {
    statusCode,
    message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: config.isProduction ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message: config.isProduction && statusCode === 500 ? 'Internal Server Error' : message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };
