const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  // App
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  isProduction: process.env.NODE_ENV === 'production',

  // Authentication
  apiKey: process.env.API_KEY || '',

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    get isConfigured() {
      return !!(this.botToken && this.chatId);
    },
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
    maxDays: process.env.LOG_MAX_DAYS || '30d',
  },

  // WhatsApp Session
  session: {
    dir: process.env.SESSION_DIR || 'sessions',
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 5,
    reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL, 10) || 5000,
  },
};

// Validate required config in production
function validateConfig() {
  const errors = [];

  if (config.isProduction && !config.apiKey) {
    errors.push('API_KEY is required in production');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }
}

validateConfig();

module.exports = config;
