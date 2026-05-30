const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const config = require('./env');

const logDir = path.resolve(process.cwd(), 'logs');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// JSON format for file output (machine-readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Daily rotate transport — Combined logs
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: config.log.maxDays, // e.g., '30d'
  format: fileFormat,
});

// Daily rotate transport — Error logs only
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: config.log.maxDays,
  level: 'error',
  format: fileFormat,
});

// Log rotation event
combinedRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

errorRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename });
});

// Build transports array
const transports = [combinedRotateTransport, errorRotateTransport];

// Add console transport in development
if (!config.isProduction) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: config.log.level,
  defaultMeta: { service: 'wa-service' },
  transports,
  // Don't exit on unhandled errors
  exitOnError: false,
});

module.exports = logger;
