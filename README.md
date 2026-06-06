# News Risk Monitor

A full-stack app that watches news for companies you care about, classifies each item by **risk type** and **impact level** using Claude, and emails alerts (immediate + daily digest) to the right people in your organisation.

Built for **India Mortgage Guarantee Corporation** — but every domain-specific value is in `.env`, so you can re-aim it at any other company.

---

## Architecture

```
+----------+      cron       +----------------+   +----------+
|  NewsAPI | <-------------- |  Node.js / API | <-> | MongoDB |
+----------+                 |  + scheduler   |   +----------+
                             |  + classifier  |
                             |  + emailer     |
+----------+      classify   +----------------+
| Claude   | <----------------------|
+----------+
                             ^
                             | REST /api/*
                             |
                       +---------------+
                       | Angular SPA   |
                       | (port 4200)   |
                       +---------------+
```

- **backend/** — Node.js + Express + Mongoose. Runs the cron jobs and exposes REST APIs.
- **frontend/** — Angular 17 standalone app, served on `:4200`, talks to the API on `:4000`.

---

## Prerequisites

| Tool                | Why                                                 |
| ------------------- | --------------------------------------------------- |
| Node.js 18+         | Backend & frontend                                  |
| MongoDB 6+ running  | Local DB (or supply Atlas URI in `.env`)            |
| NewsAPI.org key     | Free at <https://newsapi.org/register>              |
| Anthropic API key   | <https://console.anthropic.com>                     |
| SMTP credentials    | Gmail App Password, Office 365, or any SMTP server  |

---

## Setup

### 1. Backend

```powershell
cd backend
copy .env.example .env
# Edit .env and fill in NEWSAPI_KEY, ANTHROPIC_API_KEY, SMTP_*, MONGO_URI

npm install
npm run seed         # seeds a few companies + a recipient (optional)
npm run dev          # starts API on http://localhost:4000 with cron jobs
```

Health check: <http://localhost:4000/api/health>

#### Docker

```powershell
cd backend
copy .env.example .env
# Edit .env and fill in NEWSAPI_KEY, ANTHROPIC_API_KEY, SMTP_*

docker compose up --build
```

The compose setup starts the API on <http://localhost:4000> and a MongoDB 7 container with persistent data in the `mongo_data` volume. `MONGO_URI` is set automatically to the compose Mongo service.

### 2. Frontend

```powershell
cd frontend
npm install
npm start            # serves Angular on http://localhost:4200
```

Open <http://localhost:4200> in your browser.

---

## How it works

1. **Companies** page — add the companies you want to track. Each company has aliases and optional keyword boosters which combine into a NewsAPI search query.
2. **Recipients** page — add people who should receive alerts. Each recipient picks their minimum impact level and whether they want immediate alerts, daily digest, or both.
3. **Scheduler** runs every `FETCH_CRON` (default: every 2 hours):
   - For each active company, fetch latest news from NewsAPI.
   - Deduplicate by URL hash. Store new articles as `pending`.
   - For each pending article, call Claude with a cached system prompt that contains your company's context. Claude returns structured classification via tool use.
   - Any article classified at or above `ALERT_THRESHOLD` (default: `High`) triggers an immediate email to subscribed recipients.
4. **Daily digest** runs at `DIGEST_CRON` (default: 8:30 AM IST). Sends each recipient one email with all classified items from the last 24h above their minimum impact level.
5. **Dashboard** shows last-7-day stats and top high-impact items.
6. **Runs** page lets you trigger a fetch or digest manually and shows the full job history.

---

## Tuning costs

The classifier hits Claude once per new article. To control spend:

| Env var              | Default                | Tune                                                      |
| -------------------- | ---------------------- | --------------------------------------------------------- |
| `ANTHROPIC_MODEL`    | `claude-sonnet-4-6`    | Switch to `claude-haiku-4-5-20251001` (~5x cheaper)       |
| `FETCH_CRON`         | every 2h               | `0 8,14,20 * * *` to fetch only 3x/day                    |
| `NEWSAPI_PAGE_SIZE`  | 20                     | Lower this if a company is overly noisy                   |

The system prompt is sent with `cache_control: ephemeral`, so Anthropic only bills the company-context block once per 5-minute window even when you classify many articles in a row.

---

## Useful commands

```powershell
# Backend (from backend/)
npm run dev            # dev server with auto-reload
npm run seed           # ensure baseline companies + your recipient
npm run fetch:now      # run fetch+classify pipeline once and exit
npm run digest:now     # run digest pipeline once and exit

# Frontend (from frontend/)
npm start              # dev server
npm run build          # production build into dist/
```

---

## Project layout

```
news/
├── backend/
│   ├── src/
│   │   ├── config/        env + db connection
│   │   ├── models/        Company, NewsArticle, Recipient, EmailLog, RunLog
│   │   ├── services/      newsService, classifierService, emailService
│   │   ├── jobs/          fetchAndClassify, dailyDigest, scheduler
│   │   ├── routes/        companies, news, recipients, runs
│   │   ├── scripts/       runFetchOnce, runDigestOnce, seed
│   │   ├── utils/         logger
│   │   ├── app.js         express wiring
│   │   └── server.js      entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── pages/     dashboard, news-list, companies, recipients, runs
    │   │   ├── api.service.ts
    │   │   ├── models.ts
    │   │   ├── app.component.ts
    │   │   └── app.routes.ts
    │   ├── environments/
    │   ├── index.html
    │   ├── main.ts
    │   └── styles.css
    ├── angular.json
    └── package.json
```

---

## Troubleshooting

- **`MongoDB connection failed`** — confirm `mongod` is running locally, or update `MONGO_URI` to a remote (Atlas) connection string.
- **`NewsAPI error: apiKeyInvalid`** — your `NEWSAPI_KEY` is missing or wrong. The free tier is 100 requests/day — if you exceed it, fetches will start failing until reset.
- **Classifier always `failed`** — most likely missing `ANTHROPIC_API_KEY` or no credits. Check `RunLog` collection for the exact error.
- **Emails never arrive** — use the "Test" button on the Recipients page. Gmail needs an **App Password** (not your account password), not 2-step verification.
- **Angular won't start** — make sure you're on Node 18+. Run `npm install` again if you upgraded Node.

---

## Next steps you might want

- LinkedIn / X / Bloomberg connectors beyond NewsAPI
- Slack/Teams webhook in addition to email
- Per-company alert thresholds (currently global)
- Authentication on the admin UI
- Storing the full classification trail in an audit log
