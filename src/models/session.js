/**
 * Session Model
 * Represents the state of a WhatsApp session
 */

const SESSION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  QR: 'qr',
  CONNECTED: 'connected',
};

class Session {
  constructor() {
    this.status = SESSION_STATUS.DISCONNECTED;
    this.qr = null;
    this.connectedAt = null;
    this.phone = null;
    this.name = null;
    this.retries = 0;
    this.lastError = null;
    this.lastDisconnectAt = null;
  }

  /**
   * Update session status
   */
  setStatus(status) {
    this.status = status;
    if (status === SESSION_STATUS.CONNECTED) {
      this.connectedAt = new Date().toISOString();
      this.retries = 0;
      this.qr = null;
      this.lastError = null;
    }
    if (status === SESSION_STATUS.DISCONNECTED) {
      this.lastDisconnectAt = new Date().toISOString();
      this.qr = null;
    }
  }

  /**
   * Set QR code data
   */
  setQR(qr) {
    this.qr = qr;
    this.status = SESSION_STATUS.QR;
  }

  /**
   * Set connected user info
   */
  setUser(phone, name) {
    this.phone = phone;
    this.name = name;
  }

  /**
   * Increment retry counter
   */
  incrementRetry() {
    this.retries += 1;
  }

  /**
   * Reset retry counter
   */
  resetRetries() {
    this.retries = 0;
  }

  /**
   * Set last error
   */
  setError(error) {
    this.lastError = error;
  }

  /**
   * Check if session is connected
   */
  isConnected() {
    return this.status === SESSION_STATUS.CONNECTED;
  }

  /**
   * Check if max retries exceeded
   */
  isMaxRetriesExceeded(maxRetries) {
    return this.retries >= maxRetries;
  }

  /**
   * Convert to JSON for API response
   */
  toJSON() {
    return {
      status: this.status,
      phone: this.phone,
      name: this.name,
      connectedAt: this.connectedAt,
      retries: this.retries,
      lastError: this.lastError,
      lastDisconnectAt: this.lastDisconnectAt,
    };
  }
}

module.exports = { Session, SESSION_STATUS };
