require('dotenv').config();

const required = ['MONGO_URI', 'NEWSAPI_KEY', 'ANTHROPIC_API_KEY'];
const missing = required.filter((k) => !process.env[k] || process.env[k].startsWith('replace_with_'));
if (missing.length) {
  console.warn(`[env] Missing or placeholder values for: ${missing.join(', ')}. The app will run but related features will fail until configured.`);
}

const LEVELS = ['Low', 'Medium', 'High', 'Critical'];

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',

  mongoUri: process.env.MONGO_URI,

  company: {
    name: process.env.COMPANY_NAME || 'Your Company',
    industry: process.env.COMPANY_INDUSTRY || 'General',
    context: process.env.COMPANY_CONTEXT || ''
  },

  newsapi: {
    key: process.env.NEWSAPI_KEY,
    pageSize: parseInt(process.env.NEWSAPI_PAGE_SIZE || '20', 10),
    language: process.env.NEWSAPI_LANGUAGE || 'en'
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1024', 10),
    fewShotLimit: parseInt(process.env.FEW_SHOT_LIMIT || '5', 10)
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.EMAIL_FROM_NAME || 'News Risk Monitor',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER
  },

  cron: {
    fetch: process.env.FETCH_CRON || '0 */2 * * *',
    digest: process.env.DIGEST_CRON || '30 8 * * *',
    timezone: process.env.CRON_TIMEZONE || 'Asia/Kolkata'
  },

  alertThreshold: process.env.ALERT_THRESHOLD || 'High',
  LEVELS
};
