# Architecture

## Overview

The pilot is a standalone workspace for Priority 1: Program Optimization Agent.

```text
frontend -> same-origin Next.js proxy -> backend routes -> program service -> repository
shared   -> sample data, KPI rollups, anomaly rules, report inputs
```

The frontend uses relative `/api/*` and `/health` calls. Next.js rewrites those requests to the backend origin, which removes direct browser-to-backend coupling and keeps local navigation on a single origin.

## Runtime Modes

- Memory mode: default local demo with Walker-Miller sample programs and data sources.
- Supabase mode: optional persistence through the repository adapter and schema in `docs/supabase-schema.sql`.
- AI fallback mode: default report generation when no `OPENAI_API_KEY` is set.
- OpenAI mode: executive briefs are generated from portfolio rollups, anomaly summaries, and action recommendations.

## Domain Flow

1. Load fragmented program feeds into a common program model.
2. Calculate program KPIs: delivery, margin, equity delta, capacity risk, schedule risk, compliance risk, and data risk.
3. Roll up portfolio metrics for executive review.
4. Detect anomalies across program metrics and data-source freshness.
5. Generate recommended leadership actions.
6. Produce an executive brief from the same normalized decision inputs.

## Operator Workflow

1. Review the executive overview for portfolio health, active exceptions, and next actions.
2. Filter the program portfolio or anomaly queue using URL-backed filters for a focused review.
3. Open a program detail page to inspect source freshness, anomalies, and recommended actions.
4. Move to reports with the same portfolio context to generate the executive brief.

## Walker-Miller Fit

The sample data reflects the analytical report themes: rapid growth, demand exceeding capacity, multi-partner utility programs, equity outcomes, compliance controls, and the need for leadership visibility across program delivery.

## Next Phase

The current implementation is a Phase 1 pilot. Phase 2 is intended to move the system into live operations by adding real data integrations, alerting, action tracking, trend analysis, and stronger governance. See `docs/phase-2-live-operations.md`.
