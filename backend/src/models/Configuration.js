const mongoose = require('mongoose');

const LevelDefs = {
  Low: { type: String, default: '' },
  Medium: { type: String, default: '' },
  High: { type: String, default: '' },
  Critical: { type: String, default: '' }
};

const RiskTypeDefs = {
  financial: { type: String, default: '' },
  operational: { type: String, default: '' },
  reputational: { type: String, default: '' },
  regulatory: { type: String, default: '' },
  competitive: { type: String, default: '' },
  strategic: { type: String, default: '' }
};

const ConfigurationSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    riskLevelDefinitions: LevelDefs,
    impactLevelDefinitions: LevelDefs,
    riskTypeDefinitions: RiskTypeDefs,
    extraGuidance: { type: String, default: '' },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

ConfigurationSchema.statics.getSingleton = async function () {
  let cfg = await this.findOne({ key: 'global' });
  if (!cfg) cfg = await this.create({ key: 'global' });
  return cfg;
};

module.exports = mongoose.model('Configuration', ConfigurationSchema);
