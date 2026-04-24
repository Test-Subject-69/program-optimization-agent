import assert from "node:assert/strict";
import { InMemoryProgramRepository } from "../src/repositories/in-memory-program-repository.js";
import { ProgramService } from "../src/services/program-service.js";

const repository = new InMemoryProgramRepository();
const service = new ProgramService({
  repository,
  reportService: {
    mode: "test",
    async generateExecutiveBrief() {
      return {
        id: "report-test",
        title: "Test brief",
        focus: "executive-weekly",
        audience: "Executive leadership",
        mode: "test",
        summary: "Test summary",
        risks: [],
        actions: [],
        createdAt: "2026-04-23T00:00:00.000Z"
      };
    }
  }
});

const dashboard = await service.getDashboard();
const programs = await service.listPrograms();
const detail = await service.getProgramDetail(programs[0].id);
const anomalies = await service.listAnomalies();
const report = await service.generateReport({ focus: "board-readout" });
const reports = await service.listReports();
const action = await service.saveTrackedAction({
  title: "Escalate staffing plan",
  owner: "COO",
  programId: programs[0].id,
  reason: "Capacity remains below target",
  due: "2026-04-30"
});
const alert = await service.saveAlert({
  title: "Imported source quality warning",
  category: "Data",
  severity: "medium",
  detail: "Imported records need review.",
  programId: programs[0].id
});
const updatedAction = await service.saveTrackedAction({ id: action.id, status: "done" });
const updatedAlert = await service.saveAlert({ id: alert.id, status: "resolved" });
const template = await service.saveReportTemplate({
  name: "Board review",
  focus: "board-readout",
  audience: "Board"
});
const importResult = await service.importDataSource({
  dataSource: {
    name: "Partner import feed",
    sourceType: "JSON",
    owner: "Program Operations",
    qualityScore: 82,
    freshnessHours: 30
  },
  programs: [
    {
      name: "Imported Partner Program",
      programType: "Imported delivery",
      utilityPartner: "Partner utility",
      state: "OH",
      owner: "Program Operations",
      executiveSponsor: "COO",
      metrics: {
        householdsServed: 44,
        householdsTarget: 80
      }
    }
  ],
  importedAt: "2026-04-24T00:00:00.000Z"
});
const templates = await service.listReportTemplates();
const thresholds = await service.listOptimizationThresholds();
const updatedThresholds = await service.saveOptimizationThresholds({ deliveryWarningPct: 84 });
const snapshots = await service.listKpiSnapshots(programs[0].id);

await assert.rejects(
  () =>
    service.importDataSource({
      dataSource: {
        name: "Broken feed",
        sourceType: "JSON",
        owner: "Program Operations"
      },
      programs: [{ name: "Broken program" }]
    }),
  (error) => {
    assert.equal(error.statusCode, 400);
    assert.ok(Array.isArray(error.validationErrors));
    return true;
  }
);

const syncRuns = await service.listSyncRuns();
const auditEvents = await service.listAuditEvents();
const openActions = await service.listTrackedActions({ status: "open", programId: programs[0].id });
const resolvedAlerts = await service.listAlerts({ status: "resolved", programId: programs[0].id });
const refreshedDashboard = await service.getDashboard();
const refreshedDetail = await service.getProgramDetail(programs[0].id);

assert.equal(dashboard.summary.programCount, 6);
assert.equal(programs.length, 6);
assert.equal(detail.program.id, programs[0].id);
assert.equal(anomalies.anomalies.length > 0, true);
assert.equal(report.id, "report-test");
assert.equal(reports.length, 1);
assert.equal(action.owner, "COO");
assert.equal(alert.category, "Data");
assert.equal(updatedAction.status, "done");
assert.equal(updatedAlert.status, "resolved");
assert.equal(template.focus, "board-readout");
assert.equal(importResult.programs.length, 1);
assert.equal(importResult.syncRun.status, "success");
assert.equal(syncRuns.length >= 2, true);
assert.equal(templates.some((entry) => entry.name === "Board review"), true);
assert.equal(auditEvents.length >= 4, true);
assert.equal(typeof thresholds.deliveryWarningPct, "number");
assert.equal(updatedThresholds.deliveryWarningPct, 84);
assert.equal(Array.isArray(snapshots), true);
assert.equal(openActions.some((entry) => entry.id === action.id), false);
assert.equal(resolvedAlerts.some((entry) => entry.id === alert.id), true);
assert.equal(Array.isArray(refreshedDashboard.alerts), true);
assert.equal(Array.isArray(refreshedDashboard.trackedActions), true);
assert.equal(Array.isArray(refreshedDashboard.degradedSources), true);
assert.equal(typeof refreshedDashboard.summary.forecastDeliveryPct, "number");
assert.equal(Array.isArray(refreshedDetail.alerts), true);
assert.equal(Array.isArray(refreshedDetail.trackedActions), true);
assert.equal(Array.isArray(refreshedDetail.syncHistory), true);
assert.equal(Array.isArray(refreshedDetail.snapshots), true);
assert.equal(Array.isArray(refreshedDetail.auditTrail), true);

console.log("backend repository smoke tests passed");
