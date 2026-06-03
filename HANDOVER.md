# BCF Opportunity Intelligence Portal — Developer Handover
**Version 1.0 · June 2026 · NXPS Development Team**

---

## What This Tool Does

An AI-powered business intelligence platform that scans planning application databases across NI, ROI, and England to identify warm sales leads for three BCF Group businesses:
- **BGR** (Bespoke Garden Rooms Ballycastle) — garden rooms, glamping, holiday pods
- **BWDS NI** (Windows & Doors) — window/door replacement, conservatories
- **BCF** (Ballycastle Climbing Frames) — outdoor play areas

Every planning application represents someone who has decided to invest in their property. The system finds them **before competitors**, scores them with AI, and pushes high-value leads into GoHighLevel CRM.

---

## Live URLs

| Service | URL |
|---|---|
| Dashboard (frontend) | https://web-production-90ce7.up.railway.app |
| API (backend) | https://opportunity-intelligence-portal-production.up.railway.app |
| API health check | https://opportunity-intelligence-portal-production.up.railway.app/health |

**Login:** `nicola@bcfgroup.co.uk` / `admin1234` ← change this

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, react-leaflet |
| Backend | Fastify, BullMQ, Node.js 20 |
| Database | PostgreSQL (Railway) via Prisma ORM |
| Queue | Redis (Railway) via BullMQ |
| AI | Anthropic Claude claude-sonnet-4-6 |
| Email | Resend (weekly digest) |
| CRM | GoHighLevel v1 API |
| Hosting | Railway (API + Web + DB + Redis) |

---

## Repository Structure

```
/
├── apps/
│   ├── api/          ← Fastify API server + scrapers + workers
│   │   └── src/
│   │       ├── jobs/
│   │       │   ├── scrapers/
│   │       │   │   ├── ni.ts           ← NI planning (TerraQuest JSON API)
│   │       │   │   ├── roi-eplanning.ts ← 25 Irish councils (HTML scraping)
│   │       │   │   ├── roi-pleanala.ts  ← ROI appeals (ArcGIS REST API)
│   │       │   │   ├── england.ts       ← England (planning.data.gov.uk API)
│   │       │   │   └── grants-daera.ts  ← DAERA/CAFRE farm grants
│   │       │   ├── queue.ts            ← BullMQ Redis connection
│   │       │   ├── scheduler.ts        ← Cron jobs
│   │       │   └── worker.ts           ← BullMQ job processors (runs in-process)
│   │       ├── middleware/auth.ts      ← JWT auth + company-based access
│   │       ├── plugins/prisma.ts       ← Prisma Fastify plugin
│   │       ├── routes/
│   │       │   ├── auth.ts             ← POST /auth/login, GET /auth/me
│   │       │   ├── leads.ts            ← GET /leads, /leads/stats, /leads/map, PATCH status
│   │       │   └── pipeline.ts         ← Notes, scrape trigger, digest, reclassify
│   │       ├── services/
│   │       │   ├── classifier.ts       ← Claude AI classification
│   │       │   ├── geocoder.ts         ← Nominatim + postcodes.io geocoding
│   │       │   ├── ghl.ts              ← GoHighLevel CRM integration
│   │       │   └── digest.ts           ← Weekly email digest (Resend)
│   │       └── seed.ts                 ← Create admin user
│   ├── web/          ← Next.js 14 dashboard
│   │   └── app/
│   │       ├── (dashboard)/
│   │       │   ├── dashboard/page.tsx  ← KPI cards, lead cards, tabs, RUN SCAN NOW
│   │       │   ├── leads/page.tsx      ← Filterable lead list (card view)
│   │       │   ├── leads/[id]/page.tsx ← Lead detail, AI summary, notes, pipeline
│   │       │   ├── pipeline/page.tsx   ← Kanban board (move leads through stages)
│   │       │   └── map/page.tsx        ← Interactive Leaflet map ← REPLACE WITH GMAP
│   │       └── login/page.tsx
│   └── worker/       ← Unused (workers run in-process with API now)
└── packages/
    └── db/           ← Prisma schema + migrations
        └── prisma/schema.prisma
```

---

## Running Locally

```bash
# Prerequisites: Node 20, pnpm 9

# 1. Install
pnpm install

# 2. Set up .env (copy from .env.example)
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, JWT_SECRET, ANTHROPIC_API_KEY, GHL keys

# 3. Generate Prisma client + run migrations
DATABASE_URL="..." pnpm db:generate
DATABASE_URL="..." pnpm db:migrate

# 4. Seed admin user
cd apps/api && pnpm seed

# 5. Start everything
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000
```

---

## Railway Deployment

**Services:**
- `opportunity-intelligenc...` — API service (uses root `railway.json`)
- `web` — Next.js frontend (Root Directory: `apps/web`, has own `apps/web/railway.json`)

**Deploy:**
```bash
railway up  # deploys API
# Web auto-deploys from GitHub push
```

**⚠️ Railway monorepo gotcha:** root `railway.json` controls the API build. The web service has its Root Directory set to `apps/web` in the Railway dashboard, and uses `apps/web/railway.json` for its own config. Do NOT put root-level Dockerfile config in `railway.json` as it will affect all services.

---

## Environment Variables (Railway API service)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Railway Postgres internal URL |
| `REDIS_URL` | Railway Redis internal URL |
| `JWT_SECRET` | Random 32-byte base64 string |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GHL_BGR_API_KEY` | GoHighLevel location API key for BGR |
| `GHL_BCF_API_KEY` | GoHighLevel location API key for BCF |
| `GHL_BGR_LOCATION_ID` | `xUZ6e10rdKZbaHFi8Sr6` |
| `GHL_BCF_LOCATION_ID` | `GSxspezlKiWYWE604ot9` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `WEB_URL` | `https://web-production-90ce7.up.railway.app` |
| `RESEND_API_KEY` | ← **TODO: Add this** (get from resend.com) |
| `DIGEST_EMAIL_TO` | `nicola@bcfgroup.co.uk` |

---

## Data Sources & Scrapers

| Source | File | Method | Schedule |
|---|---|---|---|
| NI Planning Register | `ni.ts` | TerraQuest JSON API | Daily 6am |
| ROI eplanning.ie | `roi-eplanning.ts` | HTML form scraping | Daily 6:30am |
| ROI pleanala.ie | `roi-pleanala.ts` | ArcGIS REST API | Weekly Sunday 7am |
| England planning.data.gov.uk | `england.ts` | Official JSON API | Daily 7am |
| DAERA/CAFRE grants | `grants-daera.ts` | HTML scraping | Weekly Wed 8am |

**NI Planning API discovery:** Found at `api-planningregister-planningportal.pr.tqinfra.co.uk/api/v1`. Requires `TQ-Tenant: cfb86436-414d-4459-9545-93eec37615a2` header (public key from portal's `__ENV.js`).

---

## AI Classification

Claude `claude-sonnet-4-6` classifies each new lead. Returns:
```json
{
  "project_type": "Glamping/Holiday Accommodation",
  "assigned_company": "BGR",
  "lead_score": 96,
  "estimated_value_gbp": 55000,
  "ai_summary": "High-value tourism project...",
  "suggested_action": "Contact immediately..."
}
```

Scores 0–100. Leads scoring 70+ are automatically pushed to GHL CRM.

---

## GHL Pipeline Sync

When a lead's status is updated in the portal, tags are added to the GHL contact:

| Portal status | GHL tags added |
|---|---|
| CONTACTED | `contacted`, `follow-up-3day` |
| QUOTE_SENT | `quote-sent`, `follow-up-5day` |
| NEGOTIATION | `negotiation`, `hot-lead` |
| WON | `won-client`, `closed-won` |
| LOST | `lost-prospect` |

These tags trigger GHL automations (set up in GHL by Nicola).

---

## Weekly Email Digest

Sends every Monday 8am to `nicola@bcfgroup.co.uk`.
- Beautiful dark HTML email (matches portal theme)
- Top 10 leads ranked by score
- KPIs: new this week, total leads, pipeline value
- **Requires `RESEND_API_KEY` to be set in Railway**
- Preview: `GET /pipeline/digest/preview` (admin JWT required)
- Manual send: `POST /pipeline/digest/send`

---

## Interactive Map

Currently uses **Leaflet.js + CartoDB dark tiles** (free, no API key).

### ← TODO FOR CO-DEV: Replace with Google Maps

**Why:** Client prefers Google Maps familiarity + satellite view available.
**Cost:** ~$10.50/month (well within $200 free credit).
**File to replace:** `apps/web/app/(dashboard)/map/page.tsx` + `apps/web/components/map/LeafletMap.tsx`

**Implementation steps:**
1. Get Google Maps API key from Google Cloud Console (enable Maps JavaScript API)
2. `pnpm --filter @bcf/web add @googlemaps/js-api-loader`
3. Replace `LeafletMap.tsx` with a Google Maps component using `@googlemaps/js-api-loader`
4. Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY=...` to `apps/web/.env.local` and Railway web service vars
5. The `/leads/map` API endpoint returns leads with `latitude`, `longitude` fields — keep same data shape
6. Marker colours: BGR=#4A9EFF, BWDS=#C084FC, BCF=#3ECF8E, MULTIPLE=#C9A84C
7. Click popup should still show the same lead detail panel

**API data shape** (from `GET /leads/map`):
```typescript
{
  id, planningRef, projectType, location, status,
  assignedCompany, leadScore, estimatedValue,
  latitude, longitude, sourceRegion, dateSubmitted
}
```

---

## Database Schema (key tables)

```
Lead: id, planningRef (unique), projectType, description, location, postcode,
      applicantName, dateSubmitted, dateApproved, status (enum), assignedCompany (enum),
      leadScore, estimatedValue, aiSummary, suggestedAction, sourceUrl, sourceRegion,
      intelligenceSource, latitude, longitude, ghlContactId, classifiedAt

PipelineNote: id, leadId, note, author, createdAt
ScrapeLog: id, source, leadsFound, leadsNew, status, error, durationMs, runAt
User: id, email, password (bcrypt), name, company (enum), role (ADMIN|STAFF)
```

---

## What's Done vs What's Next

### ✅ Done (Phase 1 + 2 + 3 partial)
- NI, ROI, England scrapers
- Claude AI classification + scoring
- GHL CRM push + pipeline sync
- Dashboard with KPIs + category tabs
- Leads list + detail pages
- Pipeline kanban board
- Interactive map (Leaflet — replace with Google Maps)
- Weekly email digest
- DAERA/CAFRE grants monitoring
- Geocoding (Nominatim + postcodes.io)

### 🔲 TODO
- **Google Maps** — replace Leaflet (see instructions above)
- **RESEND_API_KEY** — add to Railway for weekly digest emails
- **Scotland** — eplanning.scot (needs Playwright, Phase 4)
- **Wales** — planningapplications.gov.wales (needs Playwright, Phase 4)
- **Jersey/Guernsey/IOM** — small jurisdictions (Phase 4)
- **Tourism NI grants** — tourismni.com (funding page 404, needs investigation)
- **Building control NI** — 11 council portals (Phase 3)
- **Change admin password** — nicola@bcfgroup.co.uk / admin1234 ← CHANGE THIS

---

## Key Contacts

- **Client:** Nicola — NXPS / BCF Group
- **GHL BGR location:** `xUZ6e10rdKZbaHFi8Sr6`
- **GHL BCF location:** `GSxspezlKiWYWE604ot9`
- **GitHub repo:** https://github.com/xnoy2/opportunity-intelligence-portal
- **Railway project:** opportunity-intelligence-portal (US West)
