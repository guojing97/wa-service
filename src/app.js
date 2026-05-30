const config = require('./config/env');
const logger = require('./config/logger');
const createApp = require('./config/app');
const whatsappService = require('./services/whatsappService');
const telegramService = require('./services/telegramService');

async function main() {
  try {
    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 WA Service started`, {
        port: config.port,
        env: config.nodeEnv,
        pid: process.pid,
      });

      // Notify Telegram
      telegramService.notifyServiceStarted(config.port);
    });

    // Start WhatsApp session
    logger.info('Initializing WhatsApp connection...');
    await whatsappService.startSession();

    // ==========================================
    // Graceful Shutdown Handlers
    // ==========================================
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Disconnect WhatsApp (without clearing session)
      try {
        if (whatsappService.socket) {
          whatsappService.socket.end(undefined);
          logger.info('WhatsApp socket closed');
        }
      } catch (error) {
        logger.error('Error closing WhatsApp socket', { error: error.message });
      }

      // Give some time for cleanup
      setTimeout(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      }, 3000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason: reason?.toString() });
    });

  } catch (error) {
    logger.error('Failed to start WA Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();
