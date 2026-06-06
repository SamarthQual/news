const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000
  });
  logger.info(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = { connectDB };
