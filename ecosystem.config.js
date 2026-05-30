module.exports = {
  apps: [
    {
      name: 'wa-service',
      script: './src/app.js',
      instances: 1, // Baileys doesn't support clustering
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log configuration (PM2 logs — separate from Winston)
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Restart delay
      restart_delay: 5000,
      // Kill timeout
      kill_timeout: 5000,
    },
  ],
};
