module.exports = {
  apps: [
    {
      name: 'webhook-ai',
      script: 'dist/app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3100,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        // Opcional: aponte para o Chrome instalado no servidor para maior estabilidade
        CHROME_PATH: process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH
      },
      max_memory_restart: '300M',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      kill_timeout: 5000,
      listen_timeout: 5000,
      // Healthcheck via /health
      // Use pm2-health ou algum monitor externo para consultar http://localhost:3100/health
    }
  ]
};

