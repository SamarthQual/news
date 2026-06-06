const mongoose = require('mongoose');

const RunLogSchema = new mongoose.Schema(
  {
    job: { type: String, enum: ['fetch', 'digest', 'manual'], required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
    stats: {
      companiesProcessed: { type: Number, default: 0 },
      articlesFetched: { type: Number, default: 0 },
      articlesNew: { type: Number, default: 0 },
      articlesClassified: { type: Number, default: 0 },
      articlesFailed: { type: Number, default: 0 },
      emailsSent: { type: Number, default: 0 }
    },
    error: { type: String, default: '' }
  },
  { timestamps: true }
);

RunLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RunLog', RunLogSchema);
