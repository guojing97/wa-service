const whatsappService = require('../services/whatsappService');
const sessionManager = require('../services/sessionManager');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../config/logger');

class SessionController {
  /**
   * GET /api/session/status
   * Get current session connection status
   */
  async getStatus(req, res, next) {
    try {
      const status = whatsappService.getStatus();
      const sessionInfo = sessionManager.getSessionInfo();

      return ResponseHelper.success(res, {
        ...status,
        session: sessionInfo,
      }, 'Session status retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/session/qr
   * Get QR code for scanning
   */
  async getQR(req, res, next) {
    try {
      const status = whatsappService.getStatus();

      // Already connected
      if (status.status === 'connected') {
        return ResponseHelper.success(res, {
          status: 'connected',
          phone: status.phone,
          name: status.name,
        }, 'Already connected. No QR needed.');
      }

      // Get QR code
      const qrDataURL = await whatsappService.getQRCode();

      if (!qrDataURL) {
        // Start session if not started
        if (status.status === 'disconnected') {
          whatsappService.startSession().catch((err) => {
            logger.error('Failed to start session from QR request', { error: err.message });
          });

          return ResponseHelper.success(res, {
            status: 'connecting',
            message: 'Session is starting. Please request QR again in a few seconds.',
          }, 'Session is initializing');
        }

        return ResponseHelper.success(res, {
          status: status.status,
          message: 'QR code not available yet. Please wait and try again.',
        }, 'QR not ready');
      }

      return ResponseHelper.success(res, {
        status: 'qr',
        qr: qrDataURL,
      }, 'Scan this QR code with WhatsApp');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/session/logout
   * Logout and clear session
   */
  async logout(req, res, next) {
    try {
      await whatsappService.logout();
      return ResponseHelper.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/session/restart
   * Restart the connection
   */
  async restart(req, res, next) {
    try {
      await whatsappService.restart();
      return ResponseHelper.success(res, {
        status: 'connecting',
      }, 'Connection is restarting');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SessionController();
