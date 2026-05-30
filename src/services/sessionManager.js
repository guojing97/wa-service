const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../config/logger');

class SessionManager {
  constructor() {
    this.sessionDir = path.resolve(process.cwd(), config.session.dir);
    this._ensureSessionDir();
  }

  /**
   * Ensure session directory exists
   */
  _ensureSessionDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
      logger.info('Session directory created', { path: this.sessionDir });
    }
  }

  /**
   * Get the full path to the session directory
   */
  getSessionPath() {
    return this.sessionDir;
  }

  /**
   * Check if session files exist
   */
  hasSession() {
    try {
      const files = fs.readdirSync(this.sessionDir);
      return files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Remove all session files (used on logout/expired)
   */
  clearSession() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        const files = fs.readdirSync(this.sessionDir);
        for (const file of files) {
          const filePath = path.join(this.sessionDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
        logger.info('Session files cleared', { path: this.sessionDir });
        return true;
      }
    } catch (error) {
      logger.error('Failed to clear session files', { error: error.message });
      return false;
    }
    return false;
  }

  /**
   * Get session file count and size info
   */
  getSessionInfo() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        return { exists: false, files: 0, size: 0 };
      }

      const files = fs.readdirSync(this.sessionDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.sessionDir, file);
        const stat = fs.statSync(filePath);
        totalSize += stat.size;
      }

      return {
        exists: true,
        files: files.length,
        size: totalSize,
        sizeHuman: this._formatBytes(totalSize),
      };
    } catch {
      return { exists: false, files: 0, size: 0 };
    }
  }

  /**
   * Format bytes to human readable string
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

module.exports = new SessionManager();
