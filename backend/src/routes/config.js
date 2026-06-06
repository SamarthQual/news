const express = require('express');
const Configuration = require('../models/Configuration');

const router = express.Router();

const ALLOWED = ['riskLevelDefinitions', 'impactLevelDefinitions', 'riskTypeDefinitions', 'extraGuidance', 'updatedBy'];

router.get('/', async (req, res, next) => {
  try {
    const cfg = await Configuration.getSingleton();
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const update = {};
    for (const k of ALLOWED) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const cfg = await Configuration.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const cfg = await Configuration.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          riskLevelDefinitions: { Low: '', Medium: '', High: '', Critical: '' },
          impactLevelDefinitions: { Low: '', Medium: '', High: '', Critical: '' },
          riskTypeDefinitions: {
            financial: '', operational: '', reputational: '',
            regulatory: '', competitive: '', strategic: ''
          },
          extraGuidance: ''
        }
      },
      { new: true, upsert: true }
    );
    res.json(cfg);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
