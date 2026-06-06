const Company = require('../models/Company');
const NewsArticle = require('../models/NewsArticle');
const Recipient = require('../models/Recipient');
const RunLog = require('../models/RunLog');
const env = require('../config/env');
const logger = require('../utils/logger');
const newsService = require('../services/newsService');
const classifier = require('../services/classifierService');
const emailService = require('../services/emailService');

const LEVEL_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

async function runFetchAndClassify({ trigger = 'cron' } = {}) {
  const run = await RunLog.create({ job: trigger === 'cron' ? 'fetch' : 'manual', startedAt: new Date(), status: 'running' });
  logger.info(`=== Fetch+Classify run started (${trigger}) — runId=${run._id} ===`);

  const stats = {
    companiesProcessed: 0,
    articlesFetched: 0,
    articlesNew: 0,
    articlesClassified: 0,
    articlesFailed: 0,
    emailsSent: 0
  };

  try {
    const companies = await Company.find({ active: true });
    if (!companies.length) {
      logger.warn('No active companies configured. Add some via POST /api/companies');
    }

    for (const company of companies) {
      try {
        const res = await newsService.fetchAndStoreForCompany(company);
        stats.companiesProcessed += 1;
        stats.articlesFetched += res.fetched;
        stats.articlesNew += res.newCount;
      } catch (err) {
        logger.error(`Fetch failed for ${company.name}: ${err.message}`);
      }
    }

    const classifyResult = await classifier.classifyPending({ limit: 100 });
    stats.articlesClassified = classifyResult.classified;
    stats.articlesFailed = classifyResult.failed;

    const alertThresholdRank = LEVEL_RANK[env.alertThreshold] || 3;
    const qualifyingLevels = Object.keys(LEVEL_RANK).filter((l) => LEVEL_RANK[l] >= alertThresholdRank);
    const alertCandidates = await NewsArticle.find({
      classificationStatus: 'classified',
      emailedImmediate: false,
      $or: [
        { 'classification.impactLevel': { $in: qualifyingLevels }, userOverride: null },
        { 'userOverride.impactLevel': { $in: qualifyingLevels } }
      ]
    }).sort({ publishedAt: -1 });

    if (alertCandidates.length) {
      const allActive = await Recipient.find({ active: true, receiveImmediateAlerts: true });
      for (const article of alertCandidates) {
        const effImpact =
          (article.userOverride && article.userOverride.overriddenAt && article.userOverride.impactLevel) ||
          article.classification.impactLevel;
        const articleRank = LEVEL_RANK[effImpact] || 0;
        const audience = allActive.filter((r) => {
          if (LEVEL_RANK[r.minImpactLevel] > articleRank) return false;
          if (r.companyFilter?.length && !r.companyFilter.some((id) => id.equals(article.company))) return false;
          return true;
        });
        if (!audience.length) {
          article.emailedImmediate = true;
          await article.save();
          continue;
        }
        const info = await emailService.sendImmediateAlert(article, audience.map((r) => r.email));
        if (info) {
          stats.emailsSent += 1;
          article.emailedImmediate = true;
          await article.save();
        }
      }
    }

    run.status = stats.articlesFailed > 0 && stats.articlesClassified === 0 ? 'failed' : (stats.articlesFailed > 0 ? 'partial' : 'success');
  } catch (err) {
    logger.error(`Run failed: ${err.message}`);
    run.status = 'failed';
    run.error = err.message;
  }

  run.stats = stats;
  run.finishedAt = new Date();
  await run.save();
  logger.info(`=== Run finished: status=${run.status} stats=${JSON.stringify(stats)} ===`);
  return run;
}

module.exports = { runFetchAndClassify };
