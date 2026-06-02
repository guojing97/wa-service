const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const QRCode = require('qrcode');
const config = require('../config/env');
const logger = require('../config/logger');
const { Session, SESSION_STATUS } = require('../models/session');
const sessionManager = require('./sessionManager');
const telegramService = require('./telegramService');

class WhatsAppService {
  constructor() {
    this.socket = null;
    this.session = new Session();
    this.qrTimeout = null;
    this.connectionTimeout = null;
    this._reconnecting = false;
  }

  /**
   * Initialize and start the WhatsApp connection
   */
  async startSession() {
    try {
      this.session.setStatus(SESSION_STATUS.CONNECTING);
      logger.info('Starting WhatsApp session...');

      // Load or create auth state
      const { state, saveCreds } = await useMultiFileAuthState(
        sessionManager.getSessionPath()
      );

      // Fetch latest WA Web version
      const { version } = await fetchLatestBaileysVersion();
      logger.info('Using WA Web version', { version });

      // Create socket
      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['WA Service', 'Chrome', '10.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 25000,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
      });

      // Register event handlers
      this._registerEventHandlers(saveCreds);

      return true;
    } catch (error) {
      logger.error('Failed to start WhatsApp session', { error: error.message });
      this.session.setStatus(SESSION_STATUS.DISCONNECTED);
      this.session.setError(error.message);
      throw error;
    }
  }

  /**
   * Register all socket event handlers
   */
  _registerEventHandlers(saveCreds) {
    // Connection update handler
    this.socket.ev.on('connection.update', async (update) => {
      await this._handleConnectionUpdate(update);
    });

    // Credentials update handler — CRITICAL: must always save
    this.socket.ev.on('creds.update', saveCreds);

    // Messages upsert handler (for future webhook support)
    this.socket.ev.on('messages.upsert', (msg) => {
      if (msg.type === 'notify') {
        logger.debug('New message received', {
          from: msg.messages[0]?.key?.remoteJid,
          type: msg.messages[0]?.message
            ? Object.keys(msg.messages[0].message)[0]
            : 'unknown',
        });
      }
    });
  }

  /**
   * Handle connection status changes
   */
  async _handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    // QR Code received
    if (qr) {
      logger.info('QR code received, waiting for scan...');
      this.session.setQR(qr);

      // Set QR timeout (2 minutes)
      if (this.qrTimeout) clearTimeout(this.qrTimeout);
      this.qrTimeout = setTimeout(() => {
        if (this.session.status === SESSION_STATUS.QR) {
          logger.warn('QR code expired, will generate new one on next attempt');
        }
      }, 120000);
    }

    // Connection opened
    if (connection === 'open') {
      if (this.qrTimeout) clearTimeout(this.qrTimeout);
      this._reconnecting = false;

      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      this.connectionTimeout = setTimeout(() => {
        logger.info('Connection stable. Resetting retries.');
        this.session.resetRetries();
      }, 60000); // Consider connection stable after 60 seconds

      const user = this.socket.user;
      const phone = user?.id?.split(':')[0] || 'unknown';
      const name = user?.name || 'unknown';

      this.session.setStatus(SESSION_STATUS.CONNECTED);
      this.session.setUser(phone, name);

      logger.info('WhatsApp connected successfully', { phone, name });

      // Notify Telegram on reconnection
      await telegramService.notifyConnectionRestored(phone);
    }

    // Connection closed
    if (connection === 'close') {
      if (this.qrTimeout) clearTimeout(this.qrTimeout);
      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

      logger.warn('WhatsApp connection closed', { statusCode, errorMessage });
      this.session.setError(errorMessage);

      // Handle based on disconnect reason
      if (statusCode === DisconnectReason.loggedOut) {
        await this._handleLoggedOut();
      } else {
        await this._handleReconnect(statusCode);
      }
    }
  }

  /**
   * Handle logged out scenario (session expired)
   */
  async _handleLoggedOut() {
    logger.warn('Session logged out / expired');

    const phone = this.session.phone || 'unknown';

    // Clear session files
    sessionManager.clearSession();
    this.session.setStatus(SESSION_STATUS.DISCONNECTED);
    this.session.setUser(null, null);
    this.socket = null;

    // Send Telegram notification
    await telegramService.notifySessionExpired(phone);
  }

  /**
   * Handle reconnection with exponential backoff
   */
  async _handleReconnect(statusCode) {
    if (this._reconnecting) return;

    const isRestartRequired = statusCode === DisconnectReason.restartRequired;
    const isNetworkError = [
      DisconnectReason.connectionLost,
      DisconnectReason.connectionClosed,
      DisconnectReason.timedOut
    ].includes(statusCode);

    if (!isRestartRequired) {
      this.session.incrementRetry();
    }

    if (this.session.isMaxRetriesExceeded(config.session.maxRetries)) {
      if (!isNetworkError) {
        logger.error('Max reconnection retries reached', {
          retries: this.session.retries,
          maxRetries: config.session.maxRetries,
          statusCode
        });

        this.session.setStatus(SESSION_STATUS.DISCONNECTED);
        this.socket = null;

        await telegramService.notifyMaxRetries(this.session.retries);
        return;
      } else {
        logger.warn('Network is unstable, max retries exceeded. Continuing to reconnect with max delay...', {
          retries: this.session.retries,
          statusCode
        });
      }
    }

    // Exponential backoff: baseInterval * 2^(retry - 1), max 60s
    let delay = Math.min(
      config.session.reconnectInterval * Math.pow(2, this.session.retries - 1),
      60000
    );

    // Fast reconnect for restartRequired
    if (isRestartRequired) {
      delay = 2000;
    }

    logger.info('Reconnecting...', {
      retry: this.session.retries,
      maxRetries: config.session.maxRetries,
      delayMs: delay,
      statusCode,
    });

    this.session.setStatus(SESSION_STATUS.CONNECTING);
    this._reconnecting = true;

    setTimeout(async () => {
      this._reconnecting = false;
      try {
        await this.startSession();
      } catch (error) {
        logger.error('Reconnection failed', { error: error.message });
      }
    }, delay);
  }

  /**
   * Send text message
   */
  async sendTextMessage(jid, text) {
    this._ensureConnected();

    try {
      const result = await this.socket.sendMessage(jid, { text });
      logger.info('Text message sent', { to: jid });
      return result;
    } catch (error) {
      logger.error('Failed to send text message', {
        to: jid,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send image message
   */
  async sendImageMessage(jid, imageSource, caption = '') {
    this._ensureConnected();

    try {
      const imagePayload = this._resolveMediaSource(imageSource);
      const result = await this.socket.sendMessage(jid, {
        image: imagePayload,
        caption,
      });
      logger.info('Image message sent', { to: jid });
      return result;
    } catch (error) {
      logger.error('Failed to send image message', {
        to: jid,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send document message
   */
  async sendDocumentMessage(jid, docSource, filename, mimetype = 'application/pdf') {
    this._ensureConnected();

    try {
      const docPayload = this._resolveMediaSource(docSource);
      const result = await this.socket.sendMessage(jid, {
        document: docPayload,
        mimetype,
        fileName: filename,
      });
      logger.info('Document message sent', { to: jid, filename });
      return result;
    } catch (error) {
      logger.error('Failed to send document message', {
        to: jid,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Resolve media source — URL or base64
   */
  _resolveMediaSource(source) {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return { url: source };
    }
    // Assume base64
    return Buffer.from(source, 'base64');
  }

  /**
   * Ensure WhatsApp is connected before sending
   */
  _ensureConnected() {
    if (!this.session.isConnected() || !this.socket) {
      const error = new Error('WhatsApp is not connected');
      error.statusCode = 503;
      throw error;
    }
  }

  /**
   * Get QR code as base64 data URL
   */
  async getQRCode() {
    if (!this.session.qr) {
      return null;
    }

    try {
      const qrDataURL = await QRCode.toDataURL(this.session.qr);
      return qrDataURL;
    } catch {
      return this.session.qr; // Return raw QR string as fallback
    }
  }

  /**
   * Get current session status
   */
  getStatus() {
    return this.session.toJSON();
  }

  /**
   * Logout and clear session
   */
  async logout() {
    try {
      if (this.socket) {
        await this.socket.logout();
      }
    } catch (error) {
      logger.warn('Error during logout', { error: error.message });
    } finally {
      this.socket = null;
      sessionManager.clearSession();
      this.session.setStatus(SESSION_STATUS.DISCONNECTED);
      this.session.setUser(null, null);
      this.session.resetRetries();
      logger.info('WhatsApp logged out and session cleared');
    }
  }

  /**
   * Restart the connection
   */
  async restart() {
    logger.info('Restarting WhatsApp connection...');

    try {
      if (this.socket) {
        this.socket.end(undefined);
        this.socket = null;
      }
    } catch (error) {
      logger.warn('Error ending socket', { error: error.message });
    }

    this.session.resetRetries();
    this._reconnecting = false;

    // Brief delay before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return this.startSession();
  }
}

module.exports = new WhatsAppService();
