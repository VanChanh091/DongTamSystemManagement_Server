require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "dongtam-api",
      script: "index.js",
      exec_mode: "cluster", // cluster mode để cân bằng tải
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // instances: "max", // chạy với số core CPU được cấp
      instances: 1, 

      //     env_development: {
      //   NODE_ENV: "development",
      //   PORT: 5000,
      // },

      // env_production: {
      //   NODE_ENV: "production",
      //   PORT: 5000,
      // },

      // Log files (PM2 sẽ lưu trong C:\\Users\userName\.pm2\logs\)
      error_file: "./logs/err/dongtam-api-error.log",
      out_file: "./logs/out/dongtam-api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],

  pm2: {
    logrotate: {
      max_size: "15M",
      retain: 15,
      compress: true,
      dateFormat: "YYYY-MM-DD_HH-mm-ss",
      workerInterval: 300,
      rotateInterval: "0 0 * * *",
      rotateModule: true,
    },
  },
};
