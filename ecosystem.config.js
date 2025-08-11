const { exec } = require("child_process");

module.exports = {
  apps: [
    {
      name: 'food-portal',             // Name shown in `pm2 list`
      script: 'dist/index.js',              // Entry point of your app
      watch: true,                     // Auto-restart on file changes
      ignore_watch: ['node_modules', 'dist/logs'], // Ignore watching these
      exec_mode: 'cluster',       // Use cluster mode for load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: './logs/err.log',    // Error log path
      out_file: './logs/out.log',      // Output log path
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      instances: 1,                    // Use `max` for all cores
      autorestart: true,
      max_memory_restart: '300M',      // Restart if memory exceeds limit
    }
  ]
};
