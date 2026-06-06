const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { startScheduler } = require('./jobs/scheduler');

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port}`);
    logger.info(`Monitoring news for: ${env.company.name}`);
    startScheduler();
  });
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => logger.error('UnhandledRejection: %s', reason));
process.on('uncaughtException', (err) => logger.error('UncaughtException: %s', err.message));
