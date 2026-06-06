const cron = require('node-cron');
const env = require('../config/env');
const logger = require('../utils/logger');
const { runFetchAndClassify } = require('./fetchAndClassify');
const { runDailyDigest } = require('./dailyDigest');

let started = false;

function startScheduler() {
  if (started) return;
  started = true;

  if (!cron.validate(env.cron.fetch)) {
    logger.warn(`Invalid FETCH_CRON expression '${env.cron.fetch}', skipping fetch schedule`);
  } else {
    cron.schedule(
      env.cron.fetch,
      () => {
        runFetchAndClassify({ trigger: 'cron' }).catch((err) => logger.error(err.message));
      },
      { timezone: env.cron.timezone }
    );
    logger.info(`Scheduled fetch+classify: '${env.cron.fetch}' (${env.cron.timezone})`);
  }

  if (!cron.validate(env.cron.digest)) {
    logger.warn(`Invalid DIGEST_CRON expression '${env.cron.digest}', skipping digest schedule`);
  } else {
    cron.schedule(
      env.cron.digest,
      () => {
        runDailyDigest().catch((err) => logger.error(err.message));
      },
      { timezone: env.cron.timezone }
    );
    logger.info(`Scheduled daily digest: '${env.cron.digest}' (${env.cron.timezone})`);
  }
}

module.exports = { startScheduler };
