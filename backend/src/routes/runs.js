const express = require('express');
const RunLog = require('../models/RunLog');
const EmailLog = require('../models/EmailLog');
const { runFetchAndClassify } = require('../jobs/fetchAndClassify');
const { runDailyDigest } = require('../jobs/dailyDigest');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await RunLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/emails', async (req, res, next) => {
  try {
    const items = await EmailLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/fetch-now', async (req, res, next) => {
  try {
    res.status(202).json({ ok: true, message: 'Fetch + classify started in background' });
    runFetchAndClassify({ trigger: 'manual' }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

router.post('/digest-now', async (req, res, next) => {
  try {
    res.status(202).json({ ok: true, message: 'Digest started in background' });
    runDailyDigest().catch(() => {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
