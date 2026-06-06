const { connectDB } = require('../config/db');
const Company = require('../models/Company');
const Recipient = require('../models/Recipient');
const logger = require('../utils/logger');

const SEED_COMPANIES = [
  {
    name: 'India Mortgage Guarantee Corporation',
    aliases: ['IMGC', 'India Mortgage Guarantee Corp'],
    sector: 'Mortgage Guarantee',
    relationship: 'Self',
    searchKeywords: ['mortgage guarantee']
  },
  { name: 'Aditya Birla Housing Finance Limited', aliases: ['ABHFL'], sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'Tata Capital Housing Finance Limited', aliases: ['TCHFL'], sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'Hero Housing Finance Limited', aliases: ['HHFL'], sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'State Bank of India', aliases: ['SBI'], sector: 'Banking', relationship: 'Lender Partner' },
  { name: 'Piramal Capital & Housing Finance Limited', aliases: ['PCHFL'], sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'LIC Housing Finance Limited', aliases: ['LICHFL'],sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'AXIS Bank Limited', aliases: ['AXIS'],sector: 'Banking', relationship: 'Lender Partner' },
  { name: 'The Federal Bank Limited', aliases: ['FDRL'],sector: 'Banking', relationship: 'Lender Partner' },
  { name: 'Bank of India', aliases: ['BKID'],sector: 'Banking', relationship: 'Lender Partner' },
  { name: 'PNB Housing Finance', sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'Bajaj Housing Finance', sector: 'Housing Finance', relationship: 'Lender Partner' },
  { name: 'Reserve Bank of India', aliases: ['RBI'], sector: 'Regulator', relationship: 'Watchlist' },
  { name: 'National Housing Bank', aliases: ['NHB'], sector: 'Regulator', relationship: 'Watchlist' }
];

(async () => {
  try {
    await connectDB();
    for (const c of SEED_COMPANIES) {
      await Company.updateOne({ name: c.name }, { $setOnInsert: c }, { upsert: true });
    }
    logger.info(`Seeded/ensured ${SEED_COMPANIES.length} companies`);

    const sampleRecipient = await Recipient.findOne({ email: 'samarth.srivastava@qualtechedge.com' });
    if (!sampleRecipient) {
      await Recipient.create({
        name: 'Samarth Srivastava',
        email: 'samarth.srivastava@qualtechedge.com',
        role: 'Owner',
        receiveImmediateAlerts: true,
        receiveDailyDigest: true,
        minImpactLevel: 'Medium'
      });
      logger.info('Seeded recipient: samarth.srivastava@qualtechedge.com');
    }

    process.exit(0);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
})();
