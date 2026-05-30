const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./env');
const logger = require('./logger');
const routes = require('../routes');
const { errorHandler, notFoundHandler } = require('../middlewares/errorHandler');

function createApp() {
  const app = express();

  // Security headers (relaxed CSP to allow dashboard inline styles & scripts)
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // Serve static files for dashboard UI
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // CORS setup
  app.use(
    cors({
      origin: config.isProduction ? false : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });
    next();
  });

  // Health check endpoint (no auth required)
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'WA Service is running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Dynamic config script to inject the server API key to the client automatically
  app.get('/api-config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`window.ENV_API_KEY = "${config.apiKey || ''}";`);
  });

  // API Routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
