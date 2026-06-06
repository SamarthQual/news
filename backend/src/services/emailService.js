const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined
  });
  return transporter;
}

const LEVEL_COLORS = {
  Low: '#16a34a',
  Medium: '#ca8a04',
  High: '#ea580c',
  Critical: '#dc2626'
};

const LEVEL_BADGE_BG = {
  Low: '#dcfce7',
  Medium: '#fef9c3',
  High: '#ffedd5',
  Critical: '#fee2e2'
};

function badge(level) {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:${LEVEL_COLORS[level] || '#374151'};background:${LEVEL_BADGE_BG[level] || '#f3f4f6'};">${level}</span>`;
}

function effectiveClassification(article) {
  const c = article.classification || {};
  const u = article.userOverride;
  if (!u || !u.overriddenAt) return { ...c.toObject?.() || c, source: 'ai' };
  return {
    riskType: u.riskType || c.riskType,
    riskLevel: u.riskLevel || c.riskLevel,
    impactLevel: u.impactLevel || c.impactLevel,
    sentiment: u.sentiment || c.sentiment,
    rationale: c.rationale,
    keyEntities: c.keyEntities,
    suggestedActions: c.suggestedActions,
    confidence: c.confidence,
    source: 'user'
  };
}

function articleCardHtml(article) {
  const c = effectiveClassification(article);
  const userNote = article.userOverride?.note;
  const overrideLabel =
    c.source === 'user'
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#ede9fe;color:#6d28d9;border:1px dashed #c4b5fd;">user override</span>`
      : '';
  const published = article.publishedAt
    ? new Date(article.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : '';
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:0 0 14px 0;background:#fff;">
      <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">
        <strong style="color:#111827;">${escapeHtml(article.companyName)}</strong>
        &nbsp;·&nbsp; ${escapeHtml(article.source || 'unknown source')}
        &nbsp;·&nbsp; ${published}
      </div>
      <a href="${escapeHtml(article.url)}" style="color:#1d4ed8;font-size:15px;font-weight:600;text-decoration:none;">
        ${escapeHtml(article.title)}
      </a>
      <div style="margin-top:8px;">
        ${badge('Impact: ' + (c.impactLevel || 'Low'))}
        ${badge('Risk: ' + (c.riskLevel || 'Low'))}
        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#f3f4f6;color:#374151;">${escapeHtml(c.riskType || 'none')}</span>
        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;background:#f3f4f6;color:#374151;">${escapeHtml(c.sentiment || 'Neutral')}</span>
        ${overrideLabel}
      </div>
      ${c.rationale ? `<p style="font-size:13px;color:#374151;margin:10px 0 6px 0;line-height:1.45;">${escapeHtml(c.rationale)}</p>` : ''}
      ${userNote ? `<p style="font-size:12px;color:#6d28d9;margin:6px 0 0 0;line-height:1.45;"><strong>User note:</strong> ${escapeHtml(userNote)}</p>` : ''}
      ${article.description && !c.rationale ? `<p style="font-size:12px;color:#6b7280;margin:6px 0 0 0;line-height:1.45;">${escapeHtml(article.description)}</p>` : ''}
      ${
        c.suggestedActions && c.suggestedActions.length
          ? `<div style="margin-top:8px;font-size:12px;color:#374151;"><strong>Suggested:</strong> ${c.suggestedActions.map(escapeHtml).join('; ')}</div>`
          : ''
      }
    </div>
  `;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmail(headline, summary, bodyHtml) {
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;color:#111827;">
  <div style="max-width:680px;margin:0 auto;">
    <div style="background:#111827;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0;">
      <div style="font-size:18px;font-weight:700;">${escapeHtml(headline)}</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${escapeHtml(summary)}</div>
    </div>
    <div style="background:#f3f4f6;padding:18px;border-radius:0 0 8px 8px;">
      ${bodyHtml}
    </div>
    <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">
      ${escapeHtml(env.company.name)} · automated news risk monitor
    </div>
  </div>
</body></html>`;
}

async function sendImmediateAlert(article, recipients) {
  if (!recipients.length) return null;
  const eff = effectiveClassification(article);
  const subject = `[${eff.impactLevel || 'Alert'}] ${article.companyName}: ${article.title.slice(0, 80)}`;
  const html = wrapEmail(
    `${eff.impactLevel || 'Alert'} impact news`,
    `${article.companyName} · ${eff.riskType || 'unspecified'}`,
    articleCardHtml(article)
  );

  try {
    const info = await getTransporter().sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.from}>`,
      to: recipients.join(', '),
      subject,
      html
    });
    await EmailLog.create({
      type: 'immediate',
      recipients,
      subject,
      articleCount: 1,
      articleIds: [article._id],
      status: 'sent',
      messageId: info.messageId
    });
    logger.info(`✉ immediate alert sent to ${recipients.length} recipient(s): ${subject}`);
    return info;
  } catch (err) {
    await EmailLog.create({
      type: 'immediate',
      recipients,
      subject,
      articleCount: 1,
      articleIds: [article._id],
      status: 'failed',
      error: err.message
    });
    logger.error(`✉ immediate alert FAILED: ${err.message}`);
    return null;
  }
}

async function sendDigest(articles, recipients, { label = 'Daily Digest' } = {}) {
  if (!recipients.length || !articles.length) return null;

  const grouped = {
    Critical: [],
    High: [],
    Medium: [],
    Low: []
  };
  for (const a of articles) {
    const eff = effectiveClassification(a);
    const lvl = eff.impactLevel || 'Low';
    grouped[lvl].push(a);
  }

  let body = '';
  for (const level of ['Critical', 'High', 'Medium', 'Low']) {
    if (!grouped[level].length) continue;
    body += `<h3 style="font-size:13px;color:${LEVEL_COLORS[level]};margin:18px 0 10px 0;text-transform:uppercase;letter-spacing:0.5px;">${level} impact (${grouped[level].length})</h3>`;
    body += grouped[level].map(articleCardHtml).join('');
  }

  const subject = `${label}: ${articles.length} item${articles.length === 1 ? '' : 's'} (${grouped.Critical.length} crit, ${grouped.High.length} high)`;
  const html = wrapEmail(
    `${label} · ${env.company.name}`,
    `Last 24h: ${articles.length} classified articles`,
    body
  );

  try {
    const info = await getTransporter().sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.from}>`,
      to: recipients.join(', '),
      subject,
      html
    });
    await EmailLog.create({
      type: 'digest',
      recipients,
      subject,
      articleCount: articles.length,
      articleIds: articles.map((a) => a._id),
      status: 'sent',
      messageId: info.messageId
    });
    logger.info(`✉ digest sent to ${recipients.length} recipient(s): ${subject}`);
    return info;
  } catch (err) {
    await EmailLog.create({
      type: 'digest',
      recipients,
      subject,
      articleCount: articles.length,
      articleIds: articles.map((a) => a._id),
      status: 'failed',
      error: err.message
    });
    logger.error(`✉ digest FAILED: ${err.message}`);
    return null;
  }
}

async function sendTestEmail(toEmail) {
  const info = await getTransporter().sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.from}>`,
    to: toEmail,
    subject: `[Test] News Risk Monitor for ${env.company.name}`,
    html: wrapEmail(
      'Test email',
      'SMTP configured correctly',
      '<p style="font-size:14px;color:#374151;">If you can read this, your SMTP settings work and the app can deliver alerts.</p>'
    )
  });
  await EmailLog.create({
    type: 'test',
    recipients: [toEmail],
    subject: `[Test] News Risk Monitor for ${env.company.name}`,
    status: 'sent',
    messageId: info.messageId
  });
  return info;
}

module.exports = {
  sendImmediateAlert,
  sendDigest,
  sendTestEmail
};
