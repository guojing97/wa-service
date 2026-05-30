const axios = require('axios');
const os = require('os');
const config = require('../config/env');
const logger = require('../config/logger');

class TelegramService {
  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${config.telegram.botToken}`;
    this.chatId = config.telegram.chatId;
    this.isConfigured = config.telegram.isConfigured;
  }

  /**
   * Send a notification message to Telegram
   */
  async sendNotification(message, type = 'info') {
    if (!this.isConfigured) {
      logger.warn('Telegram notification skipped: bot not configured');
      return false;
    }

    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      success: '✅',
      disconnect: '🔌',
    };

    const formattedMessage = [
      `${emoji[type] || 'ℹ️'} *WA Service Notification*`,
      '',
      `📋 *Type:* ${type.toUpperCase()}`,
      `💻 *Host:* ${os.hostname()}`,
      `🕐 *Time:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
      '',
      `📝 *Message:*`,
      message,
    ].join('\n');

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: formattedMessage,
        parse_mode: 'Markdown',
      });

      logger.info('Telegram notification sent', { type, success: true });
      return response.data;
    } catch (error) {
      // Don't crash the app if Telegram fails
      logger.error('Failed to send Telegram notification', {
        error: error.message,
        type,
      });
      return false;
    }
  }

  /**
   * Send session expired notification
   */
  async notifySessionExpired(phone = 'unknown') {
    return this.sendNotification(
      `WhatsApp session has *expired/logged out*.\n` +
        `📱 Phone: ${phone}\n` +
        `Session files have been cleaned up.\n` +
        `Please re-scan QR code to reconnect.`,
      'disconnect'
    );
  }

  /**
   * Send max retries reached notification
   */
  async notifyMaxRetries(retries) {
    return this.sendNotification(
      `Connection failed after *${retries} retries*.\n` +
        `Service has stopped reconnecting.\n` +
        `Manual intervention required.`,
      'error'
    );
  }

  /**
   * Send service started notification
   */
  async notifyServiceStarted(port) {
    return this.sendNotification(
      `WA Service started successfully.\n` + `🌐 Port: ${port}\n` + `🔧 Environment: ${config.nodeEnv}`,
      'success'
    );
  }

  /**
   * Send connection restored notification
   */
  async notifyConnectionRestored(phone) {
    return this.sendNotification(`WhatsApp connected successfully.\n` + `📱 Phone: ${phone}`, 'success');
  }
}

module.exports = new TelegramService();
