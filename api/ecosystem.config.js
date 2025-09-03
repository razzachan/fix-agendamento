module.exports = {
  apps: [
    {
      name: 'fix-api',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '400M',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Calendar grid & lunch
        CALENDAR_SLOT_MIN: 60,
        CALENDAR_INJECT_LUNCH: 'true',
        CALENDAR_LUNCH_START: '12:00',
        CALENDAR_LUNCH_END: '13:00',
        // CORS
        ALLOWED_ORIGINS: 'https://staging-app.eletrofixhubpro.com',
        // Supabase (SET IN SERVER SECURELY)
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Calendar grid & lunch
        CALENDAR_SLOT_MIN: 60,
        CALENDAR_INJECT_LUNCH: 'true',
        CALENDAR_LUNCH_START: '12:00',
        CALENDAR_LUNCH_END: '13:00',
        // CORS (adjust if you serve app from another domain)
        ALLOWED_ORIGINS: 'https://app.eletrofixhubpro.com,https://www.eletrofixhubpro.com',
        // Supabase (SET IN SERVER SECURELY)
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  ],
};

