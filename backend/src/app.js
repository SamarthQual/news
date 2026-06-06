const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');

const companies = require('./routes/companies');
const news = require('./routes/news');
const recipients = require('./routes/recipients');
const runs = require('./routes/runs');
const config = require('./routes/config');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin.split(',').map((s) => s.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(
    '/api/',
    rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })
  );

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      time: new Date().toISOString(),
      company: env.company.name,
      model: env.anthropic.model
    });
  });

  app.use('/api/companies', companies);
  app.use('/api/news', news);
  app.use('/api/recipients', recipients);
  app.use('/api/runs', runs);
  app.use('/api/config', config);

  app.use((err, req, res, next) => {
    logger.error(`API error: ${err.message}`);
    res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  });

  return app;
}

module.exports = { createApp };
