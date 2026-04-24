# API

Backend URL defaults to `http://localhost:4000`.

From the frontend, use the same-origin proxy instead of calling the backend port directly:

- `/api/*`
- `/health`

The Next.js app rewrites those requests to `API_ORIGIN` (default `http://localhost:4000`).

## Auth

`POST /api/auth/demo-session`

```json
{
  "role": "admin"
}
```

Returns a demo JWT, CSRF token, and user record for `read-only`, `operator`, or `admin`.

`GET /api/auth/me`

Returns the current auth context when a bearer token is provided.

## Health

`GET /health`

Returns repository and AI mode.

## Dashboard

`GET /api/dashboard`

Returns portfolio summary, enriched programs, anomalies, recommended actions, tracked actions, unresolved alerts, degraded data sources, and recent sync runs.

## Programs

`GET /api/programs`

Returns all programs with calculated KPIs.

`GET /api/programs/:id`

Returns one program with related data sources, anomalies, tracked actions, alerts, recommended actions, sync history, KPI snapshots, thresholds, and audit trail.

`PATCH /api/programs/:id`

Updates program ownership or KPI metrics.

`DELETE /api/programs/:id`

Soft-deletes a program. Admin only.

`GET /api/programs/export/csv`

Exports the current program table as CSV.

## Anomalies

`GET /api/anomalies`

Returns the portfolio summary and detected exceptions across delivery, capacity, equity, compliance, and data quality.

## Actions

`GET /api/actions`

Returns tracked follow-up actions. Supports `status`, `programId`, and `alertId` query filters.

`POST /api/actions`

Creates a tracked action.

`PATCH /api/actions/:id`

Updates a tracked action. Common changes are status transitions such as `open`, `in-progress`, and `done`.

## Alerts

`GET /api/alerts`

Returns tracked alerts. Supports `status`, `severity`, and `programId` query filters.

`POST /api/alerts`

Creates a tracked alert.

`PATCH /api/alerts/:id`

Updates a tracked alert. Common changes are status transitions such as `open`, `acknowledged`, and `resolved`.

`DELETE /api/alerts/:id`

Soft-deletes a tracked alert. Admin only.

## Reports

`GET /api/reports`

Returns generated executive briefs for the current repository session.

`POST /api/reports/generate`

```json
{
  "focus": "executive-weekly",
  "audience": "Executive leadership",
  "includeActions": true
}
```

Generates a Walker-Miller executive brief using OpenAI when configured, otherwise deterministic fallback text.

`GET /api/reports/:id/export/pdf`

Exports a saved brief as PDF.

## Data Sources

`GET /api/data-sources`

Returns ETL/import feeds plus recent sync runs.

Response shape includes:

- `dataSources`: feeds with owner, freshness, record count, quality score, and program coverage
- `syncRuns`: recent successful or failed import attempts with timestamps and validation errors

`POST /api/data-sources/import`

```json
{
  "dataSource": {
    "name": "Partner operations export",
    "sourceType": "JSON",
    "owner": "Program Operations",
    "qualityScore": 96,
    "freshnessHours": 12
  },
  "programs": [
    {
      "name": "Imported Efficiency Program",
      "programType": "Energy efficiency",
      "utilityPartner": "Utility partner",
      "state": "MI",
      "owner": "Program Operations",
      "executiveSponsor": "COO"
    }
  ]
}
```

Imports and normalizes program data into the common program model, stores a sync run, and returns the imported programs plus any generated data-quality alerts.

## Settings

`GET /api/settings/thresholds`

Returns the current optimization thresholds used for anomaly detection and forecasting.

`PATCH /api/settings/thresholds`

Updates the optimization thresholds. Admin only.

## Audit Events

`GET /api/audit-events`

Returns audit events with actor identity. Admin only.

## Setup

`POST /api/setup/seed`

Resets memory mode to the bundled Walker-Miller demo data.
