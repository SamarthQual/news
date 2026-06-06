const express = require('express');
const Recipient = require('../models/Recipient');
const emailService = require('../services/emailService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await Recipient.find().sort({ name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const item = await Recipient.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email must be unique' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const item = await Recipient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Recipient.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/test-email', async (req, res, next) => {
  try {
    const recipient = await Recipient.findById(req.params.id);
    if (!recipient) return res.status(404).json({ error: 'Not found' });
    const info = await emailService.sendTestEmail(recipient.email);
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
