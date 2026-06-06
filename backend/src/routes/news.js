const express = require('express');
const NewsArticle = require('../models/NewsArticle');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { company, impactLevel, riskType, status, limit = 50, skip = 0, search } = req.query;
    const filter = {};
    if (company) filter.company = company;
    if (impactLevel) filter['classification.impactLevel'] = impactLevel;
    if (riskType) filter['classification.riskType'] = riskType;
    //if (!riskType) filter['classification.riskType'] = { $ne: 'none' };
    if (status) filter.classificationStatus = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const [items, total] = await Promise.all([
      NewsArticle.find(filter)
        .sort({ publishedAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(Math.min(parseInt(limit, 10), 200))
        .populate('company', 'name relationship'),
      NewsArticle.countDocuments(filter)
    ]);

    res.json({ items, total });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [byImpact, byRisk, byCompany, recentCount] = await Promise.all([
      NewsArticle.aggregate([
        { $match: { classificationStatus: 'classified', /*publishedAt: { $gte: since }*/ } },
        { $group: { _id: '$classification.impactLevel', count: { $sum: 1 } } }
      ]),
      NewsArticle.aggregate([
        { $match: { classificationStatus: 'classified', /*publishedAt: { $gte: since }*/ } },
        { $group: { _id: '$classification.riskType', count: { $sum: 1 } } }
      ]),
      NewsArticle.aggregate([
        { $match: { /*publishedAt: { $gte: since }*/ } },
        { $group: { _id: '$companyName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      NewsArticle.countDocuments({ /*publishedAt: { $gte: since } "classification.riskType": {$ne: 'none'}*/ })
    ]);

    res.json({
      window: '7d',
      total: recentCount,
      byImpact,
      byRisk,
      topCompanies: byCompany
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await NewsArticle.findById(req.params.id).populate('company');
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/override', async (req, res, next) => {
  try {
    const allowed = ['riskType', 'riskLevel', 'impactLevel', 'sentiment', 'note', 'overriddenBy'];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    update.overriddenAt = new Date();

    const item = await NewsArticle.findByIdAndUpdate(
      req.params.id,
      { $set: { userOverride: update } },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/override', async (req, res, next) => {
  try {
    const item = await NewsArticle.findByIdAndUpdate(
      req.params.id,
      { $set: { userOverride: null } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await NewsArticle.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
