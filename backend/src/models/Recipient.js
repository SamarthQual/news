const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    role: { type: String, default: '' },
    receiveImmediateAlerts: { type: Boolean, default: true },
    receiveDailyDigest: { type: Boolean, default: true },
    minImpactLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'High' },
    companyFilter: { type: [mongoose.Schema.Types.ObjectId], ref: 'Company', default: [] },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipient', RecipientSchema);
