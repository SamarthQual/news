const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const NewsArticle = require('../models/NewsArticle');

const NEWSAPI_URL = 'https://newsapi.org/v2/everything';

function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function buildQuery(company) {
  const terms = [company.name]//, ...(company.aliases || []), ...(company.searchKeywords || [])]
    .filter(Boolean)
    .map((t) => `"${t.trim()}"`);
  if (!terms.length) return company.name;
  return terms.join(' OR ');
}

async function fetchForCompany(company, { fromIso } = {}) {
  const params = {
    q: buildQuery(company),
    language: env.newsapi.language,
    pageSize: env.newsapi.pageSize,
    sortBy: 'publishedAt'
  };
  if (fromIso) params.from = fromIso;

  const res = await axios.get(NEWSAPI_URL, {
    params,
    headers: { 'X-Api-Key': env.newsapi.key },
    timeout: 15000
  });

  if (res.data.status !== 'ok') {
    throw new Error(`NewsAPI error: ${res.data.code} ${res.data.message}`);
  }
  return res.data.articles || [];
}

async function persistArticles(company, rawArticles) {
  let newCount = 0;
  const inserted = [];

  for (const a of rawArticles) {
    if (!a.url || !a.title) continue;

    const urlHash = hashUrl(a.url);
    try {
      const existing = await NewsArticle.exists({ company: company._id, urlHash });
      if (existing) continue;

      const doc = await NewsArticle.create({
        company: company._id,
        companyName: company.name,
        source: a.source?.name || '',
        author: a.author || '',
        title: a.title,
        description: a.description || '',
        content: a.content || '',
        url: a.url,
        urlHash,
        imageUrl: a.urlToImage || '',
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
        fetchedAt: new Date(),
        classificationStatus: 'pending'
      });
      newCount += 1;
      inserted.push(doc);
    } catch (err) {
      if (err.code === 11000) continue;
      logger.error('persist article failed: %s', err.message);
    }
  }

  return { newCount, inserted };
}

async function fetchAndStoreForCompany(company, options = {}) {
  logger.info(`Fetching news for: ${company.name}`);
  const raw = await fetchForCompany(company, options);
  const result = await persistArticles(company, raw);
  logger.info(`  → fetched=${raw.length}, new=${result.newCount}`);
  return { fetched: raw.length, ...result };
}

module.exports = {
  fetchForCompany,
  fetchAndStoreForCompany,
  hashUrl
};
