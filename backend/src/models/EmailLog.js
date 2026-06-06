const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['immediate', 'digest', 'test'], required: true },
    recipients: { type: [String], required: true },
    subject: { type: String, required: true },
    articleCount: { type: Number, default: 0 },
    articleIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'NewsArticle', default: [] },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String, default: '' },
    messageId: { type: String, default: '' }
  },
  { timestamps: true }
);

EmailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', EmailLogSchema);
