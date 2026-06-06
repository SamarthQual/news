const { connectDB } = require('../config/db');
const { runDailyDigest } = require('../jobs/dailyDigest');
const logger = require('../utils/logger');

(async () => {
  try {
    await connectDB();
    await runDailyDigest();
    process.exit(0);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
})();
