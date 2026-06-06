const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const logger = require('../utils/logger');
const NewsArticle = require('../models/NewsArticle');
const Configuration = require('../models/Configuration');

const client = new Anthropic({ apiKey: env.anthropic.apiKey });

const FEW_SHOT_LIMIT = env.anthropic.fewShotLimit;

const DEFAULT_RISK_TYPES = {
  financial: 'credit, market, liquidity, capital, earnings, default, NPA, rating actions, fraud',
  operational: 'tech outages, supply chain, key-person, fraud-internal, process failures',
  reputational: 'scandals, leadership issues, customer trust events, social media storms',
  regulatory: 'RBI/SEBI/NHB/IRDAI action, new laws, compliance breaches, sanctions',
  competitive: 'new entrants, M&A, product launches that shift the competitive landscape',
  strategic: 'long-term industry trends, market shifts, partnership changes'
};

const CLASSIFY_TOOL = {
  name: 'record_risk_classification',
  description: 'Record the risk assessment of a news article for the user company.',
  input_schema: {
    type: 'object',
    required: ['riskType', 'riskLevel', 'impactLevel', 'sentiment', 'rationale', 'confidence'],
    properties: {
      riskType: {
        type: 'string',
        enum: ['financial', 'operational', 'reputational', 'regulatory', 'competitive', 'strategic', 'none'],
        description: 'Primary category of risk this news represents.'
      },
      riskLevel: {
        type: 'string',
        enum: ['Low', 'Medium', 'High', 'Critical'],
        description: 'Severity of the underlying risk event itself.'
      },
      impactLevel: {
        type: 'string',
        enum: ['Low', 'Medium', 'High', 'Critical'],
        description: 'How materially this affects the user company specifically.'
      },
      sentiment: {
        type: 'string',
        enum: ['Positive', 'Neutral', 'Negative'],
        description: 'Overall sentiment for the user company.'
      },
      rationale: {
        type: 'string',
        description: '1-2 sentence explanation of the assessment.'
      },
      keyEntities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Notable people, companies, regulators, products, or markets mentioned.'
      },
      suggestedActions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Concrete actions the user company should consider. Empty array if none.'
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence in the assessment between 0 and 1.'
      }
    }
  }
};

function levelSection(label, defs) {
  const levels = ['Low', 'Medium', 'High', 'Critical'];
  const lines = levels.map((l) => {
    const custom = (defs && defs[l]) ? defs[l].trim() : '';
    return custom ? `- ${l}: ${custom}` : `- ${l}: (use general industry judgement)`;
  });
  return `${label}:\n${lines.join('\n')}`;
}

function riskTypeSection(defs) {
  return Object.entries(DEFAULT_RISK_TYPES)
    .map(([type, fallback]) => {
      const custom = defs && defs[type] ? defs[type].trim() : '';
      return `- ${type}: ${custom || fallback}`;
    })
    .join('\n');
}

function buildSystemPrompt(cfg) {
  const impactDefs = cfg?.impactLevelDefinitions;
  const riskDefs = cfg?.riskLevelDefinitions;
  const typeDefs = cfg?.riskTypeDefinitions;
  const extra = (cfg?.extraGuidance || '').trim();

  return `You are a senior risk analyst working for ${env.company.name} (industry: ${env.company.industry}).

Company context:
${env.company.context || '(no additional context provided)'}

Your job is to analyze news articles about companies the user is monitoring and classify each item along several risk dimensions, specifically through the lens of how it could affect ${env.company.name}.

Risk type definitions:
${riskTypeSection(typeDefs)}
- none: not actually risk-relevant (puff pieces, irrelevant mentions, sponsored content)

Risk level vs impact level — these are different:
- riskLevel = how severe is the underlying event in absolute terms?
- impactLevel = how materially does it affect ${env.company.name} specifically? A major bank failure is High risk but only High impact for us if we have exposure. An RBI mortgage-rule change is potentially Critical impact even if low-key in absolute risk terms.

${levelSection('Impact level definitions (how this organisation defines impact on itself)', impactDefs)}

${levelSection('Risk level definitions (how this organisation interprets severity of the underlying event)', riskDefs)}

${extra ? `Additional guidance from the team:\n${extra}\n\n` : ''}Be decisive. Pick exactly one bucket per dimension. Confidence below 0.4 means the article is too vague to classify well — return riskType "none" in that case.

You may receive prior examples in the conversation showing how the user has corrected past classifications. Treat those as the ground-truth calibration for this organisation and weight your judgement accordingly.

Always call the record_risk_classification tool with your assessment. Never reply in plain text.`;
}

function articleToUserText(article) {
  return `Company being monitored: ${article.companyName}
Source: ${article.source || 'unknown'}
Published: ${article.publishedAt ? new Date(article.publishedAt).toISOString() : 'unknown'}
URL: ${article.url}

Title: ${article.title}

Description: ${article.description || '(none)'}

Content snippet:
${article.content || article.description || '(none)'}

Classify this article.`;
}

async function fetchFewShotExamples({ limit = FEW_SHOT_LIMIT } = {}) {
  if (!limit) return [];
  const corrected = await NewsArticle.find({
    'userOverride.overriddenAt': { $exists: true, $ne: null }
  })
    .sort({ 'userOverride.overriddenAt': -1 })
    .limit(limit)
    .lean();

  return corrected.filter((a) => {
    const u = a.userOverride || {};
    const c = a.classification || {};
    return (
      (u.impactLevel && u.impactLevel !== c.impactLevel) ||
      (u.riskLevel && u.riskLevel !== c.riskLevel) ||
      (u.riskType && u.riskType !== c.riskType) ||
      (u.sentiment && u.sentiment !== c.sentiment)
    );
  });
}

function buildExampleTurns(examples) {
  const messages = [];
  examples.forEach((ex, i) => {
    const toolUseId = `example_${i}_${ex._id}`;
    const u = ex.userOverride || {};
    const c = ex.classification || {};

    messages.push({ role: 'user', content: articleToUserText(ex) });
    messages.push({
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: toolUseId,
          name: 'record_risk_classification',
          input: {
            riskType: u.riskType || c.riskType || 'none',
            riskLevel: u.riskLevel || c.riskLevel || 'Low',
            impactLevel: u.impactLevel || c.impactLevel || 'Low',
            sentiment: u.sentiment || c.sentiment || 'Neutral',
            rationale: u.note || c.rationale || 'Calibrated based on prior user correction.',
            keyEntities: c.keyEntities || [],
            suggestedActions: c.suggestedActions || [],
            confidence: 0.95
          }
        }
      ]
    });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: 'Recorded.'
        }
      ]
    });
  });
  return messages;
}

async function classifyArticle(article, { examples, config } = {}) {
  const fewShot = examples ?? (await fetchFewShotExamples());
  const cfg = config ?? (await Configuration.getSingleton());

  const messages = [
    ...buildExampleTurns(fewShot),
    { role: 'user', content: articleToUserText(article) }
  ];

  const response = await client.messages.create({
    model: env.anthropic.model,
    max_tokens: env.anthropic.maxTokens,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(cfg),
        cache_control: { type: 'ephemeral' }
      }
    ],
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: 'tool', name: 'record_risk_classification' },
    messages
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Classifier did not return a tool_use block');
  }
  const out = toolUse.input;
  return {
    riskType: out.riskType,
    riskLevel: out.riskLevel,
    impactLevel: out.impactLevel,
    sentiment: out.sentiment,
    rationale: out.rationale || '',
    keyEntities: out.keyEntities || [],
    suggestedActions: out.suggestedActions || [],
    confidence: typeof out.confidence === 'number' ? out.confidence : 0,
    model: response.model,
    classifiedAt: new Date(),
    _usage: response.usage
  };
}

async function classifyPending({ limit = 50 } = {}) {
  const pending = await NewsArticle.find({ classificationStatus: 'pending' })
    .sort({ publishedAt: -1 })
    .limit(limit);

  const fewShot = await fetchFewShotExamples();
  const cfg = await Configuration.getSingleton();
  if (fewShot.length) {
    logger.info(`  using ${fewShot.length} user-correction example(s) as few-shot calibration`);
  }
  if (cfg && (cfg.updatedAt || cfg.createdAt)) {
    logger.info(`  using risk/impact definitions last updated ${new Date(cfg.updatedAt || cfg.createdAt).toISOString()}`);
  }

  let classified = 0;
  let failed = 0;

  for (const article of pending) {
    try {
      const result = await classifyArticle(article, { examples: fewShot, config: cfg });

      const { _usage, ...persisted } = result;
      article.classification = persisted;
      article.classificationStatus = 'classified';
      article.classificationError = '';
      await article.save();
      classified += 1;
      logger.info(
        `  ✓ classified [${result.impactLevel} impact / ${result.riskType}] ${article.title.slice(0, 80)}`
      );
    } catch (err) {
      failed += 1;
      article.classificationStatus = 'failed';
      article.classificationError = err.message?.slice(0, 500) || 'unknown error';
      await article.save();
      logger.error(`  ✗ classify failed: ${err.message}`);
    }
  }

  return { classified, failed, total: pending.length };
}

module.exports = {
  classifyArticle,
  classifyPending,
  fetchFewShotExamples
};
