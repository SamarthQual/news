const NewsArticle = require('../models/NewsArticle');
const Recipient = require('../models/Recipient');
const RunLog = require('../models/RunLog');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const LEVEL_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

async function runDailyDigest() {
  const run = await RunLog.create({ job: 'digest', startedAt: new Date(), status: 'running' });
  logger.info(`=== Daily digest run started — runId=${run._id} ===`);

  const stats = { articlesClassified: 0, emailsSent: 0 };

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const articles = await NewsArticle.find({
      classificationStatus: 'classified',
      $or: [{ publishedAt: { $gte: since } }, { fetchedAt: { $gte: since } }]
    })
      .sort({ publishedAt: -1 })
      .limit(200);

    stats.articlesClassified = articles.length;

    if (!articles.length) {
      logger.info('No articles in last 24h, skipping digest');
      run.status = 'success';
    } else {
      const recipients = await Recipient.find({ active: true, receiveDailyDigest: true });
      for (const r of recipients) {
        const filtered = articles.filter((a) => {
          const effImpact =
            (a.userOverride && a.userOverride.overriddenAt && a.userOverride.impactLevel) ||
            a.classification.impactLevel;
          if (LEVEL_RANK[effImpact] < LEVEL_RANK[r.minImpactLevel]) return false;
          if (r.companyFilter?.length && !r.companyFilter.some((id) => id.equals(a.company))) return false;
          return true;
        });
        if (!filtered.length) continue;
        const info = await emailService.sendDigest(filtered, [r.email], { label: 'Daily Digest' });
        if (info) {
          stats.emailsSent += 1;
          for (const a of filtered) {
            a.includedInDigest = true;
            await a.save();
          }
        }
      }
      run.status = 'success';
    }
  } catch (err) {
    logger.error(`Digest run failed: ${err.message}`);
    run.status = 'failed';
    run.error = err.message;
  }

  run.stats = stats;
  run.finishedAt = new Date();
  await run.save();
  logger.info(`=== Digest finished: status=${run.status} stats=${JSON.stringify(stats)} ===`);
  return run;
}

module.exports = { runDailyDigest };
