# Phase 2 Implementation Backlog

This backlog converts the Phase 2 roadmap into concrete implementation tickets against the current codebase.

## How To Use This Backlog

- `Now`: foundation work that unlocks the rest of Phase 2.
- `Next`: functional work that depends on the foundation.
- `Later`: hardening and rollout work that should land before production use.

## Suggested Delivery Sequence

1. Start with persistence, repository contracts, and tests.
2. Add import, sync, alert, and action APIs.
3. Update the overview, program detail, and data quality flows.
4. Add trends, forecasting, report templates, and exports.
5. Finish with permissions, auditability, and operational monitoring.

## Data Workstream

### `P2-DATA-01` Extend persistence schema for live operations

- Priority: `Now`
- Scope: Add persistent structures for tracked actions, alerts, sync runs, report templates, and audit events.
- Touchpoints:
  - `docs/supabase-schema.sql`
  - `backend/src/repositories/supabase-program-repository.js`
  - `backend/src/repositories/in-memory-program-repository.js`
  - `backend/src/repositories/create-repository.js`
- Done when:
  - the repository contract supports listing and saving actions, alerts, sync history, templates, and audit events
  - memory and Supabase modes expose the same methods
  - repository smoke tests cover the new entities

### `P2-DATA-02` Build import and normalization pipeline

- Priority: `Now`
- Scope: Create a service that accepts source payloads, validates them, maps them into the common program model, and stores import results.
- Touchpoints:
  - `backend/src/services/`
  - `backend/src/routes/data-sources.js`
  - `shared/src/validation.js`
  - `shared/src/index.js`
  - `backend/tests/`
- Done when:
  - imports produce normalized program and data-source records
  - validation errors are captured with human-readable messages
  - failed imports do not overwrite good data

### `P2-DATA-03` Add sync history and source-health tracking

- Priority: `Next`
- Scope: Track last successful refresh, last failed refresh, record counts, quality checks, and validation errors per source.
- Touchpoints:
  - `backend/src/services/`
  - `backend/src/routes/data-sources.js`
  - `backend/src/services/program-service.js`
  - `frontend/app/data-sources/page.jsx`
  - `frontend/lib/api.js`
- Done when:
  - each source shows current sync health and recent sync history
  - the backend can report stale, failed, and degraded sources distinctly
  - the UI can show why a source is not trusted

## Backend Workstream

### `P2-BE-01` Expand repository and service contracts

- Priority: `Now`
- Scope: Extend the application service layer to support actions, alerts, trends, sync history, and report templates without breaking the existing dashboard APIs.
- Touchpoints:
  - `backend/src/services/program-service.js`
  - `backend/src/services/report-service.js`
  - `backend/src/repositories/`
  - `backend/src/app.js`
  - `backend/tests/repository-smoke.test.mjs`
  - `backend/tests/routes-smoke.test.mjs`
- Done when:
  - the service layer exposes new read and write operations for Phase 2 entities
  - existing endpoints still return the current contract
  - smoke tests cover the expanded service surface

### `P2-BE-02` Add action and alert APIs

- Priority: `Next`
- Scope: Add routes for listing, creating, updating, resolving, and escalating tracked actions and alerts.
- Touchpoints:
  - `backend/src/routes/`
  - `backend/src/app.js`
  - `backend/src/utils/http.js`
  - `backend/src/services/program-service.js`
  - `frontend/lib/api.js`
  - `backend/tests/routes-smoke.test.mjs`
- Done when:
  - actions can be assigned, updated, and marked complete
  - alerts can be listed by severity, program, and status
  - overdue and unresolved items are queryable for the overview page

### `P2-BE-03` Add trend, forecast, and explanation logic

- Priority: `Next`
- Scope: Expand the shared decision logic to compute trends, forecast risk, and plain-language explanations for score changes.
- Touchpoints:
  - `shared/src/optimization.js`
  - `shared/src/index.js`
  - `shared/tests/optimization.test.mjs`
  - `backend/src/services/program-service.js`
  - `backend/src/routes/dashboard.js`
  - `backend/src/routes/programs.js`
- Done when:
  - program and portfolio responses include trend direction and simple forecast outputs
  - each anomaly and health shift includes a plain-language explanation
  - shared tests cover the new calculations

### `P2-BE-04` Add notification delivery adapter

- Priority: `Later`
- Scope: Add a notification layer for email, webhook, or chat delivery so high-severity alerts can leave the dashboard.
- Touchpoints:
  - `backend/src/services/`
  - `backend/src/config/env.js`
  - `backend/src/app.js`
  - `docs/api.md`
- Done when:
  - the system can emit notifications for configured alert events
  - notification failures are logged without breaking request handling
  - alert delivery can be disabled or configured per environment

## Frontend Workstream

### `P2-FE-01` Upgrade overview page for active operations

- Priority: `Next`
- Scope: Expand the overview into a live operating view with unresolved alerts, overdue actions, sync health, and clearer score explanations.
- Touchpoints:
  - `frontend/app/page.jsx`
  - `frontend/lib/api.js`
  - `frontend/lib/format.js`
  - `frontend/components/ui.jsx`
- Done when:
  - the overview shows actions and alerts separately
  - users can see overdue work and degraded data sources without drilling in
  - score explanations are readable by non-technical users

### `P2-FE-02` Add action tracking on program detail pages

- Priority: `Next`
- Scope: Let users create, assign, update, and complete actions directly from program detail pages.
- Touchpoints:
  - `frontend/app/programs/[id]/page.jsx`
  - `frontend/lib/api.js`
  - `frontend/components/ui.jsx`
- Done when:
  - program pages show tracked actions, status, and due dates
  - users can update action state without page reload confusion
  - alert context is visible next to related actions

### `P2-FE-03` Add trend and forecast views

- Priority: `Next`
- Scope: Add visual trend views for delivery, staffing, backlog, compliance, and data freshness, plus a simple forecast summary.
- Touchpoints:
  - `frontend/app/page.jsx`
  - `frontend/app/programs/page.jsx`
  - `frontend/app/programs/[id]/page.jsx`
  - `frontend/components/`
  - `frontend/lib/api.js`
- Done when:
  - users can see whether a program is improving, flat, or worsening
  - trends are understandable on desktop and mobile
  - forecast messaging is plain language, not only raw percentages

### `P2-FE-04` Expand the data quality page into an operations view

- Priority: `Later`
- Scope: Add sync history, validation errors, failed refresh states, and remediation guidance to the data quality page.
- Touchpoints:
  - `frontend/app/data-sources/page.jsx`
  - `frontend/lib/api.js`
  - `frontend/components/ui.jsx`
- Done when:
  - each source shows latest sync outcome and failure details
  - users can tell the difference between stale, failed, and low-quality feeds
  - remediation guidance is visible without reading logs

## Reporting Workstream

### `P2-REP-01` Add report templates and reusable review modes

- Priority: `Next`
- Scope: Persist report templates so weekly leadership, board, capacity, and partner reviews can use consistent structure.
- Touchpoints:
  - `backend/src/services/report-service.js`
  - `backend/src/routes/reports.js`
  - `frontend/app/reports/page.jsx`
  - `frontend/lib/api.js`
  - `docs/supabase-schema.sql`
- Done when:
  - report templates can be created and selected
  - report generation uses saved template defaults
  - report history captures which template was used

### `P2-REP-02` Improve executive brief quality and traceability

- Priority: `Next`
- Scope: Make generated briefs explain the drivers behind portfolio status and show where the summary came from.
- Touchpoints:
  - `backend/src/services/report-service.js`
  - `shared/src/optimization.js`
  - `frontend/app/reports/page.jsx`
  - `frontend/lib/api.js`
- Done when:
  - reports reference top risks, actions, and trend direction clearly
  - fallback mode produces the same structure as AI mode
  - the UI can show supporting facts behind the summary

### `P2-REP-03` Add export-ready report outputs

- Priority: `Later`
- Scope: Support export flows for PDF, printable view, and presentation-ready summaries.
- Touchpoints:
  - `frontend/app/reports/page.jsx`
  - `backend/src/routes/reports.js`
  - `backend/src/services/report-service.js`
  - `docs/api.md`
- Done when:
  - users can generate a shareable report artifact
  - exported output preserves title, audience, risks, and actions
  - report exports work in fallback and AI modes

## Reliability And Governance Workstream

### `P2-OPS-01` Add access control and audit trail

- Priority: `Later`
- Scope: Add role-based access checks for sensitive updates and record audit events for action, alert, sync, and report changes.
- Touchpoints:
  - `backend/src/app.js`
  - `backend/src/routes/`
  - `backend/src/services/`
  - `docs/supabase-schema.sql`
  - `frontend/app/`
- Done when:
  - write operations require an authenticated role model
  - important changes are written to an audit log
  - the UI can surface who changed what and when where relevant

### `P2-OPS-02` Expand automated test coverage

- Priority: `Now`
- Scope: Add focused tests for imports, alerts, actions, trend logic, report templates, and new repository behaviors.
- Touchpoints:
  - `shared/tests/optimization.test.mjs`
  - `backend/tests/repository-smoke.test.mjs`
  - `backend/tests/routes-smoke.test.mjs`
  - additional test files under `backend/tests/` and `shared/tests/`
- Done when:
  - Phase 2 logic is covered beyond smoke-level happy paths
  - tests include stale data, validation failures, overdue actions, and fallback report cases
  - the root `npm test` command runs the added coverage

### `P2-OPS-03` Add health and rollout instrumentation

- Priority: `Later`
- Scope: Extend health reporting to include repository readiness, sync status, alert delivery status, and recent error counts.
- Touchpoints:
  - `backend/src/app.js`
  - `backend/src/routes/`
  - `frontend/components/health-status.jsx`
  - `frontend/lib/api.js`
  - `docs/api.md`
- Done when:
  - operators can quickly tell whether the system is healthy enough to trust
  - health checks differentiate API uptime from data readiness
  - degraded subsystems are visible in one place

## Milestone Cut

### Milestone 1: Foundation

- `P2-DATA-01`
- `P2-DATA-02`
- `P2-BE-01`
- `P2-OPS-02`

### Milestone 2: Operational Workflows

- `P2-DATA-03`
- `P2-BE-02`
- `P2-FE-01`
- `P2-FE-02`

### Milestone 3: Trends And Reporting

- `P2-BE-03`
- `P2-FE-03`
- `P2-REP-01`
- `P2-REP-02`

### Milestone 4: Rollout Hardening

- `P2-BE-04`
- `P2-FE-04`
- `P2-REP-03`
- `P2-OPS-01`
- `P2-OPS-03`
