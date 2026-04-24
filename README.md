# Walker-Miller Program Optimization Agent

Priority 1 pilot for Walker-Miller Energy Services. The app turns fragmented program data into an executive decision dashboard with portfolio KPIs, program drill-downs, anomaly detection, action tracking, historical KPI snapshots, forecasting, sample ETL status, and AI-generated executive briefs.

## Stack

- `frontend/`: Next.js 16 operational dashboard.
- `backend/`: Express API with memory-first repository and Supabase-ready adapter.
- `shared/`: Walker-Miller sample data, KPI scoring, anomaly rules, portfolio rollups, and tests.
- `docs/`: API notes, architecture, phase roadmap, implementation backlog, sample metric CSV, and Supabase schema.

## Quick Start

```bash
npm install
copy .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000
```

The root page is the login screen. After sign-in, the executive dashboard opens at:

```text
http://localhost:3000/overview
```

Backend:

```text
http://localhost:4000
```

`npm run dev` starts the backend first, verifies that `/api/dashboard` is this app's Program Optimization Agent API, then starts the frontend with a same-origin proxy to the backend. The browser talks only to `http://localhost:3000`; Next.js forwards `/api/*` and `/health` to the backend.

To use Supabase Auth for the login page, add these values to `.env` and restart the app:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
DEFAULT_SUPABASE_ROLE=read-only
```

If you later switch `DATABASE_MODE=supabase`, also set `SUPABASE_SECRET_KEY` or the legacy `SUPABASE_SERVICE_ROLE_KEY`.

The app reads `role` from Supabase `app_metadata` or `user_metadata`. Supported roles are `read-only`, `operator`, and `admin`.

If you run the servers separately, start the backend before the frontend:

```bash
npm run dev:backend
npm run dev:frontend
```

To diagnose local port conflicts:

```bash
npm run doctor:local
```

## Demo Path

1. Open `/`, sign in or continue with the local demo session, then review `/overview` for portfolio health, delivery, equity reach, capacity gap, and recommended actions.
2. Open `/programs` and compare program lines.
3. Drill into `/programs/dte-multifamily-efficiency`.
4. Open `/anomalies` and filter risk exceptions.
5. Open `/reports`, generate an executive brief, and export it as PDF.
6. Open `/data-sources` and inspect sample ETL freshness and quality.

## Commands

```bash
npm test
npm run check
npm run doctor:local
npm run dev
npm run build:frontend
npm run dev:backend
npm run dev:frontend
npm run start:backend
```

## AI Mode

The report generator uses deterministic fallback copy unless `OPENAI_API_KEY` is configured. Set `OPENAI_MODEL` if you want a specific OpenAI model.

## Demo Security

- When Supabase Auth env vars are configured, users sign in at `/login`.
- Supabase access tokens are accepted by the backend and mapped to `read-only`, `operator`, or `admin`.
- Without Supabase Auth env vars, the login screen offers a local demo session and the app shows the role selector after entry.
- Demo write routes require JWT auth plus the matching CSRF token header.

## Roadmap

- Phase 1: executive-demo pilot with sample data, KPI scoring, anomaly detection, and executive briefs.
- Phase 2: live operations rollout with real data integration, alerts, action tracking, trend views, and stronger reporting.

See `docs/phase-2-live-operations.md` for the detailed Phase 2 plan.
See `docs/phase-2-implementation-backlog.md` for the Phase 2 implementation backlog.

## Safety

This is an executive-demo pilot. It does not connect to live utility, finance, HR, or customer systems by default. Supabase schema and repository support are included for a later persistent version.
