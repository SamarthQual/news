const { connectDB } = require('../config/db');
const { runFetchAndClassify } = require('../jobs/fetchAndClassify');
const logger = require('../utils/logger');

(async () => {
  try {
    await connectDB();
    await runFetchAndClassify({ trigger: 'manual' });
    process.exit(0);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
})();
