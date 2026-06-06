const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    aliases: { type: [String], default: [] },
    sector: { type: String, default: '' },
    relationship: {
      type: String,
      enum: ['Self', 'Customer', 'Competitor', 'Lender Partner', 'Partner', 'Vendor', 'Watchlist'],
      default: 'Watchlist'
    },
    searchKeywords: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

CompanySchema.index({ active: 1 });

CompanySchema.virtual('queryString').get(function () {
  const terms = [this.name, ...(this.aliases || []), ...(this.searchKeywords || [])]
    .filter(Boolean)
    .map((t) => `"${t}"`);
  return terms.join(' OR ');
});

module.exports = mongoose.model('Company', CompanySchema);
