import assert from "node:assert/strict";

import { createApp } from "../src/app.js";
import { InMemoryProgramRepository } from "../src/repositories/in-memory-program-repository.js";

const repository = new InMemoryProgramRepository();
const app = createApp({
  repository,
  reportService: {
    mode: "test",
    async generateExecutiveBrief() {
      return {
        id: "report-route-test",
        title: "Route brief",
        focus: "executive-weekly",
        audience: "Executive leadership",
        mode: "test",
        summary: "Route summary",
        risks: [],
        actions: [],
        createdAt: "2026-04-23T00:00:00.000Z"
      };
    }
  }
});

const server = app.listen(0);
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

async function createSession(role = "admin") {
  const response = await fetch(`${baseUrl}/api/auth/demo-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  assert.equal(response.status, 200);
  return response.json();
}

function authHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.token}`,
    "X-CSRF-Token": session.csrfToken
  };
}

try {
  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.app, "program-optimization-agent");

  const dashboard = await fetch(`${baseUrl}/api/dashboard`).then((response) => response.json());
  assert.equal(dashboard.summary.programCount, 6);
  assert.ok(dashboard.anomalies.length > 0);
  assert.ok(Array.isArray(dashboard.trackedActions));
  assert.ok(Array.isArray(dashboard.alerts));
  assert.ok(Array.isArray(dashboard.degradedSources));
  assert.ok(dashboard.thresholds);

  const programs = await fetch(`${baseUrl}/api/programs`).then((response) => response.json());
  assert.equal(programs.programs.length, 6);

  const detailResponse = await fetch(`${baseUrl}/api/programs/${programs.programs[0].id}`);
  assert.equal(detailResponse.status, 200);
  const detailBody = await detailResponse.json();
  assert.ok(Array.isArray(detailBody.trackedActions));
  assert.ok(Array.isArray(detailBody.alerts));
  assert.ok(Array.isArray(detailBody.syncHistory));
  assert.ok(Array.isArray(detailBody.snapshots));
  assert.ok(Array.isArray(detailBody.auditTrail));

  const anomalies = await fetch(`${baseUrl}/api/anomalies`).then((response) => response.json());
  assert.ok(anomalies.anomalies.length > 0);
  assert.ok(anomalies.thresholds);

  const dataSources = await fetch(`${baseUrl}/api/data-sources`).then((response) => response.json());
  assert.ok(dataSources.dataSources.length > 0);
  assert.ok(Array.isArray(dataSources.syncRuns));

  const viewerSession = await createSession("read-only");
  const adminSession = await createSession("admin");

  const unauthorizedMutation = await fetch(`${baseUrl}/api/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ focus: "executive-weekly" })
  });
  assert.equal(unauthorizedMutation.status, 401);

  const viewerMutation = await fetch(`${baseUrl}/api/reports/generate`, {
    method: "POST",
    headers: authHeaders(viewerSession),
    body: JSON.stringify({ focus: "executive-weekly" })
  });
  assert.equal(viewerMutation.status, 201);

  const reportResponse = await fetch(`${baseUrl}/api/reports/generate`, {
    method: "POST",
    headers: authHeaders(adminSession),
    body: JSON.stringify({ focus: "executive-weekly" })
  });
  assert.equal(reportResponse.status, 201);
  const reportBody = await reportResponse.json();
  assert.equal(reportBody.report.id, "report-route-test");

  const reportPdfResponse = await fetch(`${baseUrl}/api/reports/${reportBody.report.id}/export/pdf`);
  assert.equal(reportPdfResponse.status, 200);
  assert.equal(reportPdfResponse.headers.get("content-type"), "application/pdf");

  const createActionResponse = await fetch(`${baseUrl}/api/actions`, {
    method: "POST",
    headers: authHeaders(adminSession),
    body: JSON.stringify({
      title: "Route action",
      owner: "COO",
      programId: programs.programs[0].id,
      due: "2026-04-30",
      reason: "Route-created action"
    })
  });
  assert.equal(createActionResponse.status, 201);
  const createActionBody = await createActionResponse.json();
  assert.equal(createActionBody.action.title, "Route action");

  const patchActionResponse = await fetch(`${baseUrl}/api/actions/${createActionBody.action.id}`, {
    method: "PATCH",
    headers: authHeaders(adminSession),
    body: JSON.stringify({ status: "done" })
  });
  assert.equal(patchActionResponse.status, 200);
  const patchActionBody = await patchActionResponse.json();
  assert.equal(patchActionBody.action.status, "done");

  const listActionsResponse = await fetch(
    `${baseUrl}/api/actions?status=done&programId=${encodeURIComponent(programs.programs[0].id)}`
  ).then((response) => response.json());
  assert.ok(listActionsResponse.actions.some((action) => action.id === createActionBody.action.id));

  const createAlertResponse = await fetch(`${baseUrl}/api/alerts`, {
    method: "POST",
    headers: authHeaders(adminSession),
    body: JSON.stringify({
      title: "Route alert",
      category: "Data",
      severity: "high",
      programId: programs.programs[0].id,
      detail: "Route-created alert"
    })
  });
  assert.equal(createAlertResponse.status, 201);
  const createAlertBody = await createAlertResponse.json();
  assert.equal(createAlertBody.alert.title, "Route alert");

  const patchAlertResponse = await fetch(`${baseUrl}/api/alerts/${createAlertBody.alert.id}`, {
    method: "PATCH",
    headers: authHeaders(adminSession),
    body: JSON.stringify({ status: "acknowledged" })
  });
  assert.equal(patchAlertResponse.status, 200);
  const patchAlertBody = await patchAlertResponse.json();
  assert.equal(patchAlertBody.alert.status, "acknowledged");

  const listAlertsResponse = await fetch(
    `${baseUrl}/api/alerts?status=acknowledged&programId=${encodeURIComponent(programs.programs[0].id)}`
  ).then((response) => response.json());
  assert.ok(listAlertsResponse.alerts.some((alert) => alert.id === createAlertBody.alert.id));

  const deleteAlertResponse = await fetch(`${baseUrl}/api/alerts/${createAlertBody.alert.id}`, {
    method: "DELETE",
    headers: authHeaders(adminSession)
  });
  assert.equal(deleteAlertResponse.status, 200);

  const patchProgramResponse = await fetch(`${baseUrl}/api/programs/${programs.programs[0].id}`, {
    method: "PATCH",
    headers: authHeaders(adminSession),
    body: JSON.stringify({
      owner: "Updated Owner",
      executiveSponsor: "Updated Sponsor",
      metrics: { householdsTarget: 23000, staffingCapacityPct: 81 }
    })
  });
  assert.equal(patchProgramResponse.status, 200);
  const patchProgramBody = await patchProgramResponse.json();
  assert.equal(patchProgramBody.program.owner, "Updated Owner");

  const csvResponse = await fetch(`${baseUrl}/api/programs/export/csv`);
  assert.equal(csvResponse.status, 200);
  assert.match(await csvResponse.text(), /program-portfolio|dte-multifamily-efficiency/i);

  const thresholdResponse = await fetch(`${baseUrl}/api/settings/thresholds`);
  assert.equal(thresholdResponse.status, 200);
  const thresholdBody = await thresholdResponse.json();
  assert.equal(typeof thresholdBody.thresholds.deliveryWarningPct, "number");

  const patchThresholdResponse = await fetch(`${baseUrl}/api/settings/thresholds`, {
    method: "PATCH",
    headers: authHeaders(adminSession),
    body: JSON.stringify({ deliveryWarningPct: 84 })
  });
  assert.equal(patchThresholdResponse.status, 200);

  const importResponse = await fetch(`${baseUrl}/api/data-sources/import`, {
    method: "POST",
    headers: authHeaders(adminSession),
    body: JSON.stringify({
      dataSource: {
        name: "Route import feed",
        sourceType: "JSON",
        owner: "Program Operations",
        freshnessHours: 18,
        qualityScore: 96
      },
      programs: [
        {
          name: "Route Imported Program",
          programType: "Imported delivery",
          utilityPartner: "Utility partner",
          state: "MI",
          owner: "Program Operations",
          executiveSponsor: "COO"
        }
      ]
    })
  });
  assert.equal(importResponse.status, 201);
  const importBody = await importResponse.json();
  assert.equal(importBody.syncRun.status, "success");
  assert.equal(importBody.programs.length, 1);

  const invalidImportResponse = await fetch(`${baseUrl}/api/data-sources/import`, {
    method: "POST",
    headers: authHeaders(adminSession),
    body: JSON.stringify({
      dataSource: {
        name: "Broken route import",
        sourceType: "JSON",
        owner: "Program Operations"
      },
      programs: [{ name: "Broken program" }]
    })
  });
  assert.equal(invalidImportResponse.status, 400);
  const invalidImportBody = await invalidImportResponse.json();
  assert.ok(Array.isArray(invalidImportBody.validationErrors));
  assert.equal(invalidImportBody.syncRun.status, "failed");

  const auditEventsResponse = await fetch(`${baseUrl}/api/audit-events`, {
    headers: {
      Authorization: `Bearer ${adminSession.token}`
    }
  });
  assert.equal(auditEventsResponse.status, 200);
  const auditEventsBody = await auditEventsResponse.json();
  assert.ok(Array.isArray(auditEventsBody.auditEvents));

  const deleteProgramResponse = await fetch(`${baseUrl}/api/programs/${programs.programs[1].id}`, {
    method: "DELETE",
    headers: authHeaders(adminSession)
  });
  assert.equal(deleteProgramResponse.status, 200);

  const deletedProgramDetail = await fetch(`${baseUrl}/api/programs/${programs.programs[1].id}`);
  assert.equal(deletedProgramDetail.status, 404);
} finally {
  server.close();
}

console.log("backend route smoke tests passed");
